import { Message, PubSub, Subscription, Topic } from "@google-cloud/pubsub";
import { DocumentNode, GraphQLSchema } from "graphql";
import {
  EventBusPlugin,
  EventBusSubscriberCb,
  GraphQLEventbus,
  GraphQLEventbusMetadata,
} from "graphql-eventbus";

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
};

export class PubSubEventBus {
  public pubsubClient = new PubSub({});
  private publishTopics: { [topicName: string]: Topic } = {};
  private subscriptions: Subscription[] = [];
  private bus: GraphQLEventbus;
  constructor(private config: PubSubEventBusConfig) {
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
              await Promise.all(
                topics.map(async (topicName) => {
                  const [topic] = await this.pubsubClient
                    .topic(topicName)
                    .get({ autoCreate: true });
                  const subscriptionName = `${this.config.serviceName}-${topicName}`;
                  let subscription = await topic.subscription(
                    subscriptionName,
                    {
                      streamingOptions: {
                        maxStreams: 1,
                      },
                    },
                  );
                  const [exist] = await subscription.exists();
                  if (!exist) {
                    console.log(
                      `Service ${this.config.serviceName}: Subscription created: ${subscriptionName}`,
                    );
                    [subscription] = await subscription.create({});
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
                }),
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
    metadata?: Partial<GraphQLEventbusMetadata>;
  }) => {
    await this.bus.publish({
      payload: a.payload,
      topic: a.topic,
      metadata: a.metadata,
    });
  };
}
