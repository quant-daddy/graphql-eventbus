/* eslint-disable @typescript-eslint/ban-types */
import {
  consumerSchema,
  eventConsumerTypeDef,
  messageHandlers,
} from "#root/src/eventbus";
import { EventHandlers } from "#root/src/generated/codegen-event-consumer";
import { MemoryEventBus } from "graphql-eventbus-google-pubsub";
import gql from "graphql-tag";

let isInitialized = false;
const bus = new MemoryEventBus({
  publisher: {
    schema: consumerSchema,
  },
  plugins: [],
  subscriber: {
    queries: gql`
      ${eventConsumerTypeDef}
    `,
    cb: messageHandlers,
    schema: consumerSchema,
  },
});

export const getTestEventBus = async () => {
  if (!isInitialized) {
    await bus.init();
    isInitialized = true;
  }
  const publish = (args: {
    event: keyof EventHandlers;
    payload: {};
  }) =>
    bus.publish({
      data: args.payload,
      topicName: args.event,
    });
  return {
    publish,
  };
};
