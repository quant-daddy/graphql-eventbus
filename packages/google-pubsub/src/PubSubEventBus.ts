import {
  Message,
  PubSub,
  Subscription,
  Topic,
} from "@google-cloud/pubsub";
import { DocumentNode, GraphQLSchema } from "graphql";
import { EventBusSubscriberCb } from "graphql-eventbus-core";
import { VanillaEventBus } from "graphql-eventbus-core";
import {
  Baggage,
  EventBusPlugin,
  Metadata,
} from "graphql-eventbus-core/build/VanillaEventBus";

export type PubSubEventBusConfig = {
  publisher?: {
    schema: GraphQLSchema;
  };
  subscriber?: {
    queries: DocumentNode;
    schema: GraphQLSchema;
    cb: EventBusSubscriberCb;
  };
  plugins?: EventBusPlugin[];
  serviceName: string;
  isDarkRelease?: boolean;
};

const getBaggage = (msg: Message): Baggage => {
  const a = JSON.parse(msg.data.toString()) as {};
  if ("payload" in a && "metadata" in a) {
    return {
      metadata: (a as any).metadata,
      payload: (a as any).payload,
    };
  }
  return {
    metadata: msg.attributes as any,
    payload: a,
  };
};

const encodeBaggage = (baggage: Baggage): string => {
  if (baggage.metadata.version === "v1") {
    return JSON.stringify({
      payload: baggage.payload,
      metadata: baggage.metadata,
    });
  }
  return JSON.stringify(baggage.payload);
};

export class PubSubEventBus {
  public pubsubClient = new PubSub({});
  private publishTopics: { [topicName: string]: Topic } = {};
  private subscriptions: Subscription[] = [];
  private bus: VanillaEventBus;
  constructor(private config: PubSubEventBusConfig) {
    this.bus = new VanillaEventBus({
      plugins: config.plugins,
      publisher: this.config.publisher
        ? {
            publishInit: async (topics) => {
              for (const topicname of topics) {
                // eslint-disable-next-line no-await-in-loop
                const [topic] = await this.pubsubClient
                  .topic(topicname)
                  .get({ autoCreate: true });
                this.publishTopics[topicname] = topic;
              }
            },
            schema: this.config.publisher?.schema,
            publish: async (a) => {
              await this.publishTopics[a.topic].publishMessage({
                data: Buffer.from(encodeBaggage(a.baggage)),
              });
            },
          }
        : undefined,
      subscriber: this.config.subscriber
        ? {
            cb: this.config.subscriber?.cb,
            subscribe: async (topics, cb) => {
              await Promise.all(
                topics.map(async (topicName) => {
                  const [topic] = await this.pubsubClient
                    .topic(topicName)
                    .get({ autoCreate: true });
                  const subscriptionName = `${
                    this.config.serviceName
                  }-${topicName}${
                    this.config.isDarkRelease ? "-dark" : ""
                  }`;
                  let subscription = await topic.subscription(
                    subscriptionName,
                    {
                      streamingOptions: {
                        maxStreams: 1,
                      },
                    }
                  );
                  const [exist] = await subscription.exists();
                  if (!exist) {
                    console.log(
                      `Service ${this.config.serviceName}: Subscription created: ${subscriptionName}`
                    );
                    [subscription] = await subscription.create({
                      filter: !this.config.isDarkRelease
                        ? `NOT attributes:x-prop-${this.config.serviceName}-dark`
                        : `attributes:x-prop-${this.config.serviceName}-dark`,
                    });
                  }
                  this.subscriptions.push(subscription);
                  subscription.on("message", async (msg: Message) => {
                    try {
                      const baggage = getBaggage(msg);
                      await cb({
                        topic: topicName,
                        baggage: {
                          metadata: baggage.metadata,
                          payload: baggage.payload,
                        },
                      });
                      msg.ack();
                    } catch (e) {
                      msg.nack();
                      throw e;
                    }
                  });
                })
              );
            },
            queries: this.config.subscriber.queries,
            schema: this.config.subscriber.schema,
          }
        : undefined,
    });
  }
  closeConsumer = async () => {
    this.subscriptions.forEach((subscription) => {
      subscription.close();
    });
  };
  closePublisher = async () => {
    Object.values(this.publishTopics).forEach((topic) => {
      topic.flush();
    });
  };
  init = () => {
    return this.bus.init();
  };
  publish = async (a: {
    topic: string;
    payload: {};
    metadata: Partial<Metadata> & {
      version: "v0" | "v1";
    };
  }) => {
    await this.bus.publish({
      payload: a.payload,
      topic: a.topic,
      metadata: a.metadata,
    });
  };
}
