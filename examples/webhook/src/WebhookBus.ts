import path from "path";
import fs from "fs";
import { buildSchema } from "graphql";
import {
  MemoryEventBus,
  MemoryEventBusConfig,
  LoggingPlugin,
} from "graphql-eventbus";
import { EventHandlers, Publish } from "./generated/codegen-event";
import gql from "graphql-tag";
import { sesEventHandlers } from "./eventHandlers";
import { MetricsPlugin } from "graphql-eventbus-metrics-plugin";

export const sesEventConsumerTypedefs = fs.readFileSync(
  path.join(__dirname, "./event-consumer.graphql"),
  "utf-8",
);

export const sesPublisherSchema = buildSchema(
  fs.readFileSync(path.join(__dirname, "./schema-event.graphql"), {
    encoding: "utf-8",
  }),
);

export type MessageHandlerContext = {
  logger: typeof console.log;
};

export const sesEventBusConfig: MemoryEventBusConfig = {
  schema: sesPublisherSchema,
  subscriber: {
    cb: async ({ topic, payload }) => {
      const handler = sesEventHandlers[topic as unknown as keyof EventHandlers];
      await handler(payload as any, {
        logger: console.log,
      });
    },
    queries: gql`
      ${sesEventConsumerTypedefs}
    `,
  },
  plugins: [MetricsPlugin(), LoggingPlugin()],
};

const webhookBus = new MemoryEventBus(sesEventBusConfig);
export const publish: Publish = async (a, ...rest: any[]) => {
  await webhookBus.publish({
    payload: a.payload,
    topic: a.topic,
  });
};

let isInitialized = false;

export const initEventBus = async () => {
  if (!isInitialized) {
    await webhookBus.init();
    isInitialized = true;
  }
  return webhookBus;
};
