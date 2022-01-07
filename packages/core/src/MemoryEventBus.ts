import { EventEmitter } from "events";
import { DocumentNode, GraphQLSchema } from "graphql";
import { EventBusSubscriberCb } from "./EventBus";
import {
  DataCb,
  EventBusPlugin,
  Metadata,
  VanillaEventBus,
} from "./VanillaEventBus";

export type MemoryEventBusConfig = {
  schema: GraphQLSchema;
  subscriber?: {
    cb: EventBusSubscriberCb;
    queries: DocumentNode;
  };
  plugins?: EventBusPlugin[];
  allowInvalidTopic?: boolean;
};

export class MemoryEventBus {
  public eventEmitter = new EventEmitter();
  private bus: VanillaEventBus;
  constructor(public config: MemoryEventBusConfig) {
    this.eventEmitter.setMaxListeners(100000);
    this.bus = new VanillaEventBus({
      plugins: config.plugins,
      publisher: {
        schema: config.schema,
        publish: async (args, ...rest) => {
          this.eventEmitter.emit(
            `message-${args.topic}`,
            JSON.stringify(args.baggage),
            ...rest
          );
        },
        allowInvalidTopic: config.allowInvalidTopic,
      },
      subscriber: this.config.subscriber
        ? {
            cb: this.config.subscriber!.cb,
            subscribe: (topics, cb: DataCb) => {
              topics.forEach((topic) => {
                this.eventEmitter.on(
                  `message-${topic}`,
                  async (baggage) => {
                    await cb({
                      baggage: JSON.parse(baggage),
                      topic,
                    });
                  }
                );
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
    metadata?: Partial<Metadata>;
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
