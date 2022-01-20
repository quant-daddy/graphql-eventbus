import fs from "fs";
import path from "path";
import { eventHandlers } from "./eventHandlers";
import { EventHandlers } from "./generated/codegen-event-consumer";
import gql from "graphql-tag";
import { Publish } from "./generated/codegen-event-publisher";
import {
  EventBusSubscriberCb,
  GraphQLEventbusMetadata,
  LoggingPlugin,
} from "graphql-eventbus";
import { getSchema } from "../utils";
import {
  RabbitMQEventBus,
  RabbitMQEventBusConfig,
} from "graphql-eventbus-rabbitmq";

export type MessageHandlerContext = {
  publish: Publish;
};

export const messageHandlers: EventBusSubscriberCb = async (args) => {
  const handler = eventHandlers[args.topic as keyof EventHandlers];
  if (!handler) {
    throw new Error(`Handler for message ${args.topic} not found`);
  }
  const context: MessageHandlerContext = {
    publish: getPublish(args.metadata),
  };
  await handler(args.payload as any, context);
};

export const getPublish = (metadata?: GraphQLEventbusMetadata) => {
  const publish: Publish = (data) => {
    return eventBus.publish({
      payload: data.payload,
      topic: data.topic,
      metadata,
    });
  };
  return publish;
};

export const eventConsumerTypeDef = fs.readFileSync(
  path.join(__dirname, "./event-consumer.graphql"),
  "utf-8",
);

export const publisherSchema = getSchema(
  path.join(__dirname, "schema-event.graphql"),
);

export const consumerSchema = getSchema(
  path.join(__dirname, "generated/publisher.graphql"),
);

export const eventbusConfig: RabbitMQEventBusConfig = {
  plugins: [LoggingPlugin()],
  serviceName: "serviceB",
  publisher: {
    // same service is the publisher for the schema
    schema: publisherSchema,
  },
  subscriber: {
    cb: messageHandlers,
    queries: gql`
      ${eventConsumerTypeDef}
    `,
    schema: consumerSchema,
  },
};

// export const eventBus = new PubSubEventBus(eventbusConfig);
export const eventBus = new RabbitMQEventBus(eventbusConfig);

let isInitialized = false;

export const initServiceBEventBus = async () => {
  if (!isInitialized) {
    await eventBus.init();
    isInitialized = true;
  }
  return eventBus;
};
