import { v4 } from "uuid";
import { EventHandlers } from "./generated/codegen-event-consumer";

export const eventHandlers: EventHandlers = {
  SendEmailEvent: async (msg, ctx) => {
    console.log(
      `ServiceC received SendEmailEvent message ${JSON.stringify(
        msg
      )}`
    );
    setTimeout(() => {
      ctx.publish({
        event: "EmailOpenEvent",
        payload: {
          emailAddress: msg.emailAddress,
          eventId: v4(),
          openedAt: new Date().toISOString(),
        },
      });
    }, 1000);
  },
};
