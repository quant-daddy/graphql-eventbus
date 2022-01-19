import amqp from "amqplib";
import { DocumentNode, GraphQLSchema } from "graphql";
import {
  EventBusPlugin,
  EventBusSubscriberCb,
  GraphQLEventbus,
  GraphQLEventbusMetadata,
} from "graphql-eventbus";

export type RabbitMQEventBusConfig = {
  publisher?: {
    schema: GraphQLSchema;
  };
  subscriber?: {
    schema: GraphQLSchema;
    queries: DocumentNode;
    cb: EventBusSubscriberCb;
  };
  serviceName: string;
  plugins?: EventBusPlugin[];
};

const EXCHANGE = "event-hub";
const QUEUE_INITIALS = "graphql-eventbus-";

export class RabbitMQEventBus {
  bus!: GraphQLEventbus;
  connection!: amqp.Connection;
  consumeChannel?: amqp.Channel;
  publishChannel?: amqp.Channel;
  constructor(public config: RabbitMQEventBusConfig) {
    const queueName = `${QUEUE_INITIALS}-${config.serviceName}`;
    this.bus = new GraphQLEventbus({
      plugins: config.plugins,
      publisher: config.publisher
        ? {
            schema: config.publisher?.schema,
            publish: async args => {
              this.publishChannel?.publish(
                EXCHANGE,
                args.topic,
                Buffer.from(
                  JSON.stringify({
                    payload: args.baggage.payload,
                    metadata: args.baggage.metadata,
                  }),
                ),
              );
            },
          }
        : undefined,
      subscriber: config.subscriber
        ? {
            schema: config.subscriber.schema,
            queries: config.subscriber.queries,
            cb: config.subscriber.cb,
            subscribe: (topics, dataCb) => {
              this.consumeChannel
                ?.assertQueue(queueName, {
                  exclusive: false,
                })
                .then(() => {
                  topics.forEach(topic => {
                    this.consumeChannel?.bindQueue(queueName, EXCHANGE, topic);
                  });
                  this.consumeChannel?.consume(queueName, msg => {
                    if (msg?.content) {
                      dataCb({
                        baggage: JSON.parse(msg.content.toString("utf-8")),
                        topic: msg?.fields.routingKey,
                      })
                        .then(() => {
                          this.consumeChannel?.ack(msg);
                        })
                        .catch(e => {
                          this.consumeChannel?.nack(msg);
                          throw e;
                        });
                    }
                  });
                });
            },
          }
        : undefined,
    });
  }
  init = async (url?: string | amqp.Options.Connect) => {
    const connection = await amqp.connect(url || "amqp://localhost");
    if (this.config.publisher) {
      const channel = await connection.createChannel();
      await channel.assertExchange(EXCHANGE, "topic", {
        durable: false,
      });
      this.publishChannel = channel;
    }
    if (this.config.subscriber) {
      const channel = await connection.createChannel();
      await channel.assertExchange(EXCHANGE, "topic", {
        durable: false,
      });
      this.consumeChannel = channel;
    }
    this.connection = connection;
    await this.bus.init();
  };

  publish = (args: {
    payload: {};
    topic: string;
    metadata?: Partial<GraphQLEventbusMetadata>;
  }) => {
    return this.bus.publish({
      payload: args.payload,
      topic: args.topic,
      metadata: args.metadata,
    });
  };

  closeConsumer = async () => {
    if (this.consumeChannel) {
      await this.consumeChannel.close();
    }
  };

  closePublisher = async () => {
    if (this.publishChannel) {
      await this.publishChannel.close();
    }
  };

  close = async () => {
    this.connection.close();
  };
}
