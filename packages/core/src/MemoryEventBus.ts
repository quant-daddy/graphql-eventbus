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
            cb: this.config.subscriber.cb,
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

  init = async () => {
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

  close = async () => {
    this.eventEmitter.removeAllListeners();
  };
}
