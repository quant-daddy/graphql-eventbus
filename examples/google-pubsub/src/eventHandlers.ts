import { EventHandlers } from "./generated/codegen-event-consumer";

const userCreatedEventHandler: EventHandlers["UserCreatedEvent"] =
  async (msg, ctx) => {
    ctx.logger(`Event Received for user: ${msg.userEmail}`);
    ctx.logger(msg);
  };

const userDeletedEventHandler: EventHandlers["UserDeletedEvent"] =
  async (msg, ctx) => {
    ctx.logger(`user deleted: ${msg.userId}`);
  };

export const eventHandlers: EventHandlers = {
  UserCreatedEvent: userCreatedEventHandler,
  UserDeletedEvent: userDeletedEventHandler,
};
