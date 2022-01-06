import {
  PubSubEventBus,
  PubSubEventBusConfig,
} from "graphql-eventbus-google-pubsub";
import fs from "fs";
import path from "path";
import { buildSchema } from "graphql";
import { eventHandlers } from "./eventHandlers";
import { EventHandlers } from "./generated/codegen-event-consumer";
import { MessageHandlerContext } from "./types";
import gql from "graphql-tag";
import { Publish } from "./generated/codegen-server-event";

export const messageHandlers: (
  p: {
    key: string;
    data: {};
  },
  metadata: {}
) => Promise<unknown> = async (props, metadata) => {
  const handler = eventHandlers[props.key as keyof EventHandlers];
  if (!handler) {
    throw new Error(`Handler for message ${props.key} not found`);
  }
  const context: MessageHandlerContext = {
    logger: console.log,
  };
  await handler(props.data as any, context);
};

export const getPublish = () => {
  const publish: Publish = (data) => {
    return eventBus.publish(
      {
        data: data.payload,
        topicName: data.event,
      },
      {}
    );
  };
  return publish;
};

export const consumerSchema = buildSchema(
  fs.readFileSync(path.join(__dirname, "schema-event.graphql"), {
    encoding: "utf-8",
  })
);

export const eventConsumerTypeDef = fs.readFileSync(
  path.join(__dirname, "./event-consumer.graphql"),
  "utf-8"
);

export const eventbusConfig: PubSubEventBusConfig = {
  serviceName: "sample-app",
  publisher: {
    // same service is the publisher for the schema
    schema: consumerSchema,
  },
  subscriber: {
    cb: messageHandlers,
    queries: gql`
      ${eventConsumerTypeDef}
    `,
    schema: consumerSchema,
  },
  isDarkRelease: false,
};

export const eventBus = new PubSubEventBus(eventbusConfig);

let isInitialized = false;

export const initEventBus = async () => {
  if (!isInitialized) {
    await eventBus.init();
    isInitialized = true;
  }
  return eventBus;
};
