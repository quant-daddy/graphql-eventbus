import amqp from "amqplib";
import { DocumentNode, GraphQLSchema } from "graphql";
import {
  EventBusPlugin,
  EventBusSubscriberCb,
  VanillaEventBus,
} from "graphql-eventbus-core";

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
  bus!: VanillaEventBus;
  connection!: amqp.Connection;
  consumeChannel?: amqp.Channel;
  publishChannel?: amqp.Channel;
  constructor(public config: RabbitMQEventBusConfig) {
    const queueName = `${QUEUE_INITIALS}-${config.serviceName}`;
    this.bus = new VanillaEventBus({
      plugins: config.plugins,
      publisher: config.publisher
        ? {
            schema: config.publisher?.schema,
            publish: async (args) => {
              this.publishChannel?.publish(
                EXCHANGE,
                args.topic,
                Buffer.from(
                  JSON.stringify({
                    payload: args.baggage.payload,
                    metadata: args.baggage.metadata,
                  })
                )
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
                .then((q) => {
                  topics.forEach((topic) => {
                    this.consumeChannel?.bindQueue(
                      queueName,
                      EXCHANGE,
                      topic
                    );
                  });
                  console.log(`queue initialized`);
                  this.consumeChannel?.consume(queueName, (msg) => {
                    if (msg?.content) {
                      dataCb({
                        baggage: JSON.parse(
                          msg!.content.toString("utf-8")
                        ),
                        topic: msg?.fields.routingKey!,
                      })
                        .then(() => {
                          this.consumeChannel?.ack(msg);
                        })
                        .catch(() => {
                          this.consumeChannel?.nack(msg);
                        });
                    }
                  });
                });
            },
          }
        : undefined,
    });
  }
  init = async () => {
    const connection = await amqp.connect("amqp://localhost");
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

  publish = (args: { payload: {}; topic: string }) => {
    return this.bus.publish({
      payload: args.payload,
      topic: args.topic,
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
