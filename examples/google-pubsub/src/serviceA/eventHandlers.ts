import { EventHandlers } from "./generated/codegen-event-consumer";

export const eventHandlers: EventHandlers = {
  EmailOpenEvent: async (msg, ctx) => {
    console.log(
      `Service A EmailOpenEvent received: ${JSON.stringify(msg)}`
    );
  },
};
