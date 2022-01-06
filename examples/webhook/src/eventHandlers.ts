import { EventHandlers } from "./generated/codegen-event";

export const sesEventHandlers: EventHandlers = {
  EventA: async (payload, ctx) => ctx.logger(payload),
  EventB: async (payload, ctx) => ctx.logger(payload),
};
