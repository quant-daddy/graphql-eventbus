---
sidebar_position: 2
---

# MemoryEventBus

Let's start by creating a bus using `EventEmitter` in NodeJS as the message broker.

We define a class that use `EventEmitter` as the message broker. In the constructor function, we create an instance of `GraphQLEventbus` class. While most of the constructor argument fields are simply passed to the `GraphQLEventbus`, we have to implement the custom logic for each step above for `EventEmitter`.

- Step 1: We emit an event corresponding to a topic with the name `message-${topic}`. The `baggage`, which is an object with the event payload and the metadata is serialized string using `JSON.stringify` and published with the event.

- Step 2: We subscribe to the topics that the consumer has subscribed to and trigger the callback `DataCb` with the name of the topic and the deserialized baggage. The `GraphQLEventBus` validates the payload, extracts the fields and triggers the `subscriber.cb` event handler provided by the consumer of our bus.

- Step 3: We add an `init` method to initialize our bus. In this case, we just initialize the `GraphQLEventbus`. However, in other case, we might add other startup logic. We also add a `close` method to do `EventEmitter` cleanup. Finally, we expose a method `publish` to publish events. It simply calls `publish` on `GraphQLEventbus` and passes through the topic, payload, and metadata to be propagated.

```typescript title="https://github.com/quant-daddy/graphql-eventbus/blob/master/packages/core/src/MemoryEventBus.ts"
import { EventEmitter } from "events";
import { DocumentNode, GraphQLSchema } from "graphql";
import { EventBusSubscriberCb } from "./EventBus";
import {
  DataCb,
  EventBusPlugin,
  GraphQLEventbusMetadata,
  GraphQLEventbus,
} from "./GraphQLEventbus";

export type MemoryEventBusConfig = {
  schema: GraphQLSchema;
  subscriber?: {
    cb: EventBusSubscriberCb;
    queries: DocumentNode;
  };
  plugins?: EventBusPlugin[];
  allowPublishNonExistingTopic?: boolean;
};

export class MemoryEventBus {
  public eventEmitter = new EventEmitter();
  private bus: GraphQLEventbus;
  constructor(public config: MemoryEventBusConfig) {
    this.eventEmitter.setMaxListeners(100000);
    this.bus = new GraphQLEventbus({
      plugins: config.plugins,
      publisher: {
        schema: config.schema,
        // Step 1
        publish: async (args) => {
          this.eventEmitter.emit(
            `message-${args.topic}`,
            JSON.stringify(args.baggage),
          );
        },
        allowInvalidTopic: config.allowPublishNonExistingTopic,
      },
      subscriber: this.config.subscriber
        ? {
            cb: this.config.subscriber!.cb,
            // Step 2
            subscribe: (topics, cb: DataCb) => {
              topics.forEach((topic) => {
                this.eventEmitter.on(`message-${topic}`, async (baggage) => {
                  await cb({
                    baggage: JSON.parse(baggage),
                    topic,
                  });
                });
              });
            },
            queries: this.config.subscriber.queries,
            schema: this.config.schema,
          }
        : undefined,
    });
  }

  // Step 3 Startup Logic
  init = async () => {
    // this must be called
    await this.bus.init();
  };

  publish = async (args: {
    topic: string;
    payload: {};
    metadata?: Partial<GraphQLEventbusMetadata>;
  }) => {
    await this.bus.publish({
      topic: args.topic,
      payload: args.payload,
      metadata: args.metadata,
    });
  };

  // Step 3 Cleanup logic
  close = async () => {
    this.eventEmitter.removeAllListeners();
  };
}
```

Next, let's do a more complex case of using `RabbitMQ` as our message broker.
