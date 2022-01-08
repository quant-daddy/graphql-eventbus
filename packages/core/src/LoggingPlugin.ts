import { EventBusPlugin } from "./GraphQLEventbus";

export const LoggingPlugin: EventBusPlugin = {
  consumeStartHook: (args) => {
    console.log(
      `Event ${args.topic} received for requestId: ${args.metadata["x-request-id"]}`
    );
    return {
      consumeEndHook: () => {
        console.log(
          `Event ${args.topic} consumed for requestId: ${args.metadata["x-request-id"]}`
        );
      },
      consumeErrorHook: (err) => {
        console.log(
          `Event ${args.topic} consumer error for requestId: ${args.metadata["x-request-id"]}: ${err.message}`
        );
        console.error(err);
      },
    };
  },
  publishStartHook: (args) => {
    console.log(
      `Event ${args.topic} publish start for requestId: ${args.metadata["x-request-id"]}`
    );
    return {
      publishEndHook: () => {
        console.log(
          `Event ${args.topic} published for requestId: ${args.topic}`
        );
      },
      publishErrorHook: (err) => {
        console.log(
          `Event ${args.topic} publish error for requestId: ${args.metadata["x-request-id"]}: ${err.message}`
        );
        console.error(err);
      },
    };
  },
};
