import { EventBusValidator } from "./EventBusValidator";
import { EventBusSubscriberCb } from "./EventBus";
import { getRootQueryFields } from "./eventbus-utils";
import { DocumentNode, GraphQLError, GraphQLSchema } from "graphql";
import { InvalidPublishTopic } from ".";
import { v4 } from "uuid";
import { isPresent } from "ts-is-present";

export type DataCb = (args: {
  baggage: Baggage;
  topic: string;
}) => Promise<unknown>;

interface SubscriptionConfig {
  queries: DocumentNode;
  schema: GraphQLSchema;
  cb: EventBusSubscriberCb;
  subscribe: (topics: string[], cb: DataCb) => OptionalPromise<unknown>;
}

export interface Baggage {
  payload: {};
  metadata: GraphQLEventbusMetadata;
}

type OptionalPromise<T> = T | Promise<T> | undefined | null | void;

export type ConsumeEndHook = () => OptionalPromise<unknown>;

export type ConsumeSuccessHook = () => OptionalPromise<unknown>;

export type ConsumeErrorHook = (error: Error) => OptionalPromise<unknown>;

export type ConsumeGraphQLErrorsHook = (
  errors: GraphQLError[],
) => OptionalPromise<unknown>;

export type ConsumeDeprecatedErrorsHook = (
  errors: GraphQLError[],
) => OptionalPromise<unknown>;

export type ConsumeStartHook = (args: {
  topic: string;
  _fullData: {};
  documentNode: DocumentNode;
  metadata: GraphQLEventbusMetadata;
}) => OptionalPromise<{
  consumeEndHook?: ConsumeEndHook;
  consumeErrorHook?: ConsumeErrorHook;
  consumeGraphQLErrorHooks?: ConsumeGraphQLErrorsHook;
  consumeDeprecatedErrorHooks?: ConsumeDeprecatedErrorsHook;
  consumeSuccessHook?: ConsumeSuccessHook;
}>;

export type PublishEndHook = () => OptionalPromise<unknown>;

export type PublishSuccessHook = () => OptionalPromise<unknown>;

export type PublishErrorHook = (error: Error) => OptionalPromise<unknown>;

export type PublishStartHook = (args: {
  topic: string;
  payload: {};
  metadata: GraphQLEventbusMetadata;
}) => OptionalPromise<{
  publishEndHook?: PublishEndHook;
  publishErrorHook?: PublishErrorHook;
  publishSuccessHook?: PublishSuccessHook;
}>;

export interface EventBusPlugin {
  consumeStartHook?: ConsumeStartHook;
  publishStartHook?: PublishStartHook;
}

export interface GraphQLEventbusMetadata {
  "x-request-id": string;
  publishedAt: string;
  eventId: string;
  [key: string]: string;
}

export class GraphQLEventbus {
  private consumeValidator!: EventBusValidator | null;
  private publishValidator!: EventBusValidator | null;
  public isInitialized = false;
  constructor(
    public config: {
      publisher?: {
        schema: GraphQLSchema;
        publishInit?: (topics: string[]) => Promise<unknown>;
        publish: (args: {
          topic: string;
          baggage: Baggage;
        }) => Promise<unknown>;
        allowInvalidTopic?: boolean;
      };
      subscriber?: SubscriptionConfig;
      plugins?: EventBusPlugin[];
    },
  ) {
    if (config.publisher) {
      this.publishValidator = new EventBusValidator({
        publisherSchema: config.publisher.schema,
      });
    }
    if (config.subscriber) {
      this.consumeValidator = new EventBusValidator({
        publisherSchema: config.subscriber.schema,
      });
    }
  }

  init = async () => {
    if (this.config.publisher && this.config.publisher.publishInit) {
      const topicnames = getRootQueryFields(this.config.publisher.schema);
      await this.config.publisher.publishInit(topicnames);
    }
    if (this.config.subscriber) {
      await this.consume();
    }
    this.isInitialized = true;
  };

  private consume = async () => {
    if (!this.config.subscriber) {
      return;
    }
    if (!this.consumeValidator) {
      return;
    }
    await this.consumeValidator
      .validateConsumerQueries(this.config.subscriber.queries)
      .then(async (topics) => {
        await this.config.subscriber?.subscribe(topics, this.handleCb);
      });
  };

  private handleCb: DataCb = async ({ baggage, topic }) => {
    if (!this.config.subscriber) {
      return;
    }
    if (!this.consumeValidator) {
      return;
    }
    const consumeHooks =
      this.config.plugins?.map((a) => a.consumeStartHook).filter(isPresent) ||
      [];
    const consumeEndHooks: ConsumeEndHook[] = [];
    const consumeErrorHooks: ConsumeErrorHook[] = [];
    const consumeGraphQLErrorHooks: ConsumeGraphQLErrorsHook[] = [];
    const consumeDeprecatedErrorsHooks: ConsumeDeprecatedErrorsHook[] = [];
    const consumeSuccessHooks: ConsumeSuccessHook[] = [];
    if (consumeHooks.length) {
      await Promise.all(
        consumeHooks.map(async (hook) => {
          const foo = await hook({
            topic,
            metadata: baggage.metadata,
            _fullData: baggage.payload,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            documentNode: this.consumeValidator!.getDocumentForTopic(topic),
          });
          if (!foo) {
            return;
          }
          if (foo.consumeEndHook) {
            consumeEndHooks.push(foo.consumeEndHook);
          }
          if (foo.consumeSuccessHook) {
            consumeSuccessHooks.push(foo.consumeSuccessHook);
          }
          if (foo.consumeErrorHook) {
            consumeErrorHooks.push(foo.consumeErrorHook);
          }
          if (foo.consumeGraphQLErrorHooks) {
            consumeGraphQLErrorHooks.push(foo.consumeGraphQLErrorHooks);
          }
          if (foo.consumeDeprecatedErrorHooks) {
            consumeDeprecatedErrorsHooks.push(foo.consumeDeprecatedErrorHooks);
          }
        }),
      );
    }
    try {
      const extractedPayload = await this.consumeValidator.extractData({
        topic,
        data: baggage.payload,
      });
      if (!extractedPayload.data) {
        throw new Error(
          `Payload error: Received ${JSON.stringify(extractedPayload.data)}`,
        );
      }
      if (extractedPayload.deprecated && consumeDeprecatedErrorsHooks.length) {
        await Promise.all(
          consumeDeprecatedErrorsHooks.map((hook) => {
            return hook(extractedPayload.errors as GraphQLError[]);
          }),
        );
      }
      if (extractedPayload.errors && consumeGraphQLErrorHooks.length) {
        await Promise.all(
          consumeGraphQLErrorHooks.map((hook) => {
            return hook(extractedPayload.errors as GraphQLError[]);
          }),
        );
      }
      await this.config.subscriber.cb({
        topic: topic,
        payload: extractedPayload?.data,
        metadata: baggage.metadata,
        _fullData: baggage.payload,
      });
      if (consumeSuccessHooks.length) {
        await Promise.all(
          consumeSuccessHooks.map((hook) => {
            return hook();
          }),
        );
      }
    } catch (e) {
      if (consumeErrorHooks.length) {
        await Promise.all(
          consumeErrorHooks.map((hook) => {
            return hook(e as Error);
          }),
        );
      }
      throw e;
    } finally {
      if (consumeEndHooks.length) {
        await Promise.all(
          consumeEndHooks.map((hook) => {
            return hook();
          }),
        );
      }
    }
  };

  publish = async (props: {
    topic: string;
    payload: {};
    metadata?: Partial<GraphQLEventbusMetadata>;
  }) => {
    if (!this.publishValidator) {
      throw new Error("Publish config not added!");
    }
    const metadata: GraphQLEventbusMetadata = {
      "x-request-id": v4(),
      ...props.metadata,
      eventId: v4(),
      publishedAt: new Date().toISOString(),
    };
    const publishHooks =
      this.config.plugins?.map((a) => a.publishStartHook).filter(isPresent) ||
      [];
    const publishEndHooks: PublishEndHook[] = [];
    const publishErrorHooks: PublishErrorHook[] = [];
    const publishSuccessHooks: PublishSuccessHook[] = [];
    if (publishHooks.length) {
      await publishHooks.map(async (hook) => {
        const r = await hook({
          topic: props.topic,
          payload: props.payload,
          metadata,
        });
        if (!r) {
          return;
        }
        if (r.publishEndHook) {
          publishEndHooks.push(r.publishEndHook);
        }
        if (r.publishSuccessHook) {
          publishSuccessHooks.push(r.publishSuccessHook);
        }
        if (r.publishErrorHook) {
          publishErrorHooks.push(r.publishErrorHook);
        }
      });
    }
    try {
      await this.publishValidator.publishValidate(props);
      await this.config.publisher?.publish({
        topic: props.topic,
        baggage: {
          metadata,
          payload: props.payload,
        },
      });
      if (publishSuccessHooks.length) {
        await Promise.all(
          publishSuccessHooks.map((hook) => {
            return hook();
          }),
        );
      }
    } catch (e) {
      if (publishErrorHooks.length) {
        await Promise.all(
          publishErrorHooks.map((hook) => {
            return hook(e as Error);
          }),
        );
      }
      if (
        e instanceof InvalidPublishTopic &&
        this.config.publisher?.allowInvalidTopic
      ) {
        return;
      }
      throw e;
    } finally {
      if (publishEndHooks.length) {
        await Promise.all(
          publishEndHooks.map((hook) => {
            return hook();
          }),
        );
      }
    }
    return;
  };
}
