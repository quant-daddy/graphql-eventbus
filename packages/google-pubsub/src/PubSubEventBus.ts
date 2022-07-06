import {
  ClientConfig,
  Message,
  PubSub,
  Subscription,
  SubscriptionOptions,
  Topic,
} from "@google-cloud/pubsub";
import { DocumentNode, GraphQLSchema } from "graphql";
import {
  EventBusPlugin,
  EventBusSubscriberCb,
  GraphQLEventbus,
  GraphQLEventbusMetadata,
} from "graphql-eventbus";

export type PubSubEventBusConfig = {
  clientConfig?: ClientConfig;
  publisher?: {
    schema: GraphQLSchema;
  };
  subscriber?: {
    queries: DocumentNode;
    schema: GraphQLSchema;
    cb: EventBusSubscriberCb;
    options?: SubscriptionOptions;
  };
  plugins?: EventBusPlugin[];
  serviceName: string;
  isDarkRelease?: boolean;
};

export class PubSubEventBus {
  public pubsubClient: PubSub;
  private publishTopics: { [topicName: string]: Topic } = {};
  private subscriptions: Subscription[] = [];
  private bus: GraphQLEventbus;
  constructor(private config: PubSubEventBusConfig) {
    this.pubsubClient = new PubSub(config.clientConfig);
    this.bus = new GraphQLEventbus({
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
                data: Buffer.from(JSON.stringify(a.baggage)),
              });
            },
          }
        : undefined,
      subscriber: this.config.subscriber
        ? {
            cb: this.config.subscriber?.cb,
            subscribe: async (topics, cb) => {
              await topics.reduce(async (acc, topicName) => {
                const [topic] = await this.pubsubClient
                  .topic(topicName)
                  .get({ autoCreate: true });
                const subscriptionName = `${
                  this.config.serviceName
                }-${topicName}${this.config.isDarkRelease ? "-dark" : ""}`;
                let subscription = await topic.subscription(subscriptionName, {
                  streamingOptions: {
                    maxStreams: 1,
                  },
                  ...this.config.subscriber?.options,
                });
                const [exist] = await subscription.exists();
                if (!exist) {
                  console.log(
                    `Service ${this.config.serviceName}: Subscription created: ${subscriptionName}`,
                  );
                  [subscription] = await subscription.create({
                    filter: !this.config.isDarkRelease
                      ? `NOT attributes:x-prop-${this.config.serviceName}-dark`
                      : `attributes:x-prop-${this.config.serviceName}-dark`,
                  });
                } else {
                  console.log(
                    `Service ${this.config.serviceName}: Subscription already exists: ${subscriptionName}`,
                  );
                }
                this.subscriptions.push(subscription);
                subscription.on("message", async (msg: Message) => {
                  try {
                    const baggage = JSON.parse(msg.data.toString());
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
                return acc.then(() => Promise.resolve());
              }, Promise.resolve());
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
    payload: Record<string, unknown>;
    metadata?: Partial<GraphQLEventbusMetadata>;
  }) => {
    await this.bus.publish({
      payload: a.payload,
      topic: a.topic,
      metadata: a.metadata,
    });
  };
}
