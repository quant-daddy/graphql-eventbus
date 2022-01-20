import { v4 } from "uuid";
import { EventHandlers } from "./generated/codegen-event-consumer";

export const eventHandlers: EventHandlers = {
  SendEmailEvent: async (msg, ctx) => {
    setTimeout(() => {
      ctx.publish({
        topic: "EmailOpenEvent",
        payload: {
          emailAddress: msg.emailAddress,
          eventId: v4(),
          openedAt: new Date().toISOString(),
        },
      });
    }, 1000);
  },
};
