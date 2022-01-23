---
sidebar_position: 3
---

# RabbitMQEventBus

Let create a bus that uses [RabbitMQ](https://www.rabbitmq.com/getstarted.html) as the message broker.

We define our custom class, `RabbitMQEventBus` that use `RabbitMQ` as the message broker. In the constructor function, we create an instance of `GraphQLEventbus` class. While most of the constructor argument fields are simply passed to the `GraphQLEventbus`, we have to implement the custom logic publishing, subscribing, and initialization for `RabbitQM`. First, we create a topic exchange (idempotent operation) and initialize consume and publish channel depending on if instance of the bus publisher and/or consumes (see the `init` method).

- Step 1: We publish an event with the routing key as the name of the topic. The `baggage`, which is an object with the event payload and the metadata is serialized string using `JSON.stringify` and published as a buffer.

- Step 2: We bind the `consumeChannel` with all the topics that that the consumer has subscribed to. Note that to consume an event in `RabbitMQ`, we have to create a queue and bind it to a channel. Although not required, to load balance across multiple instance of the same service, we use a unique queue name for each service. Once we idempotently create the queue, we find all the topics that we subscribe to using the `bindQueue` method on the `consumeChannel`. Finally, we call `consume` method on the channel and invote the `DataCb` callback every time a message is received. We deserialize the payload and pass the `Baggage` to the callback. Finally, once the message is consumed successfully, we `ack` the message.

- Step 3: We add an `init` method to initialize our bus. We must initialize the `GraphQLEventbus`. In addition, we also initialize the connection and create the channels for publishing and consuming events. We also add a `closeConsumer` and a `closePublisher` method to close these channels when we close the connection. Finally, we expose a method `publish` to publish events. It simply calls `publish` on `GraphQLEventbus` and passes through the topic, payload, and metadata to be propagated.

```typescript title="https://github.com/quant-daddy/graphql-eventbus/blob/master/packages/rabbitmq/src/RabbitMQEventBus.ts"
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
            publish: async (args) => {
              // Step 1
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
              // Step 2
              this.consumeChannel
                ?.assertQueue(queueName, {
                  exclusive: false,
                })
                .then((q) => {
                  topics.forEach((topic) => {
                    this.consumeChannel?.bindQueue(queueName, EXCHANGE, topic);
                  });
                  this.consumeChannel?.consume(queueName, (msg) => {
                    if (msg?.content) {
                      dataCb({
                        baggage: JSON.parse(msg!.content.toString("utf-8")),
                        topic: msg?.fields.routingKey!,
                      })
                        .then(() => {
                          this.consumeChannel?.ack(msg);
                        })
                        .catch((e) => {
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
  // Step 3: Startup logic
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

  // Step 3: Close consumer logic
  closeConsumer = async () => {
    if (this.consumeChannel) {
      await this.consumeChannel.close();
    }
  };

  // Step 3: Close publisher logic
  closePublisher = async () => {
    if (this.publishChannel) {
      await this.publishChannel.close();
    }
  };

  // Step 3: Close the connection
  close = async () => {
    this.connection.close();
  };
}
```
