import { v4 } from "uuid";
import { EventHandlers } from "./generated/codegen-event-consumer";

export const eventHandlers: EventHandlers = {
  UserCreatedEvent: async (msg, ctx) => {
    if (!msg.userEmail) {
      return;
    }
    await ctx.publish({
      event: "SendEmailEvent",
      payload: {
        content: `Welcome ${msg.userName}`,
        emailAddress: msg.userEmail,
        eventId: v4(),
      },
    });
  },
};
