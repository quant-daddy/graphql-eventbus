import { EventBusSubscriberCb, MemoryEventBus } from "graphql-eventbus";
// /* eslint-disable @typescript-eslint/ban-types */
import {
  consumerSchema,
  eventConsumerTypeDef,
  MessageHandlerContext,
} from "../bus";
import { EventHandlers } from "../generated/codegen-event-consumer";
import gql from "graphql-tag";
import { eventHandlers } from "../eventHandlers";

export const getConsumerTestEventBus = async (
  ctx?: Partial<MessageHandlerContext>,
) => {
  const messageHandlers: EventBusSubscriberCb = async (args) => {
    const handler = eventHandlers[args.topic as keyof EventHandlers];
    if (!handler) {
      throw new Error(`Handler for message ${args.topic} not found`);
    }
    handler(args.payload as any, {
      publish: jest.fn(),
      ...ctx,
    });
  };
  const bus = new MemoryEventBus({
    schema: consumerSchema,
    subscriber: {
      cb: messageHandlers,
      queries: gql`
        ${eventConsumerTypeDef}
      `,
    },
  });
  await bus.init();
  const publish = (args: { event: keyof EventHandlers; payload: {} }) =>
    bus.publish({
      payload: args.payload,
      topic: args.event,
    });
  return {
    publish,
  };
};
