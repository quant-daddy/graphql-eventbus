import { EventBusPlugin } from "./GraphQLEventbus";

`
[%RECEIVED_TIME | PUBLISH_TIME%] "%EVENT_NAME% (PUBLISH | CONSUME)"
%(OK | DEPRECATED | ERROR)% %DURATION% "%REQ(X-REQUEST-ID)%" "%EVENT-ID%"\n
`;

export const LoggingPlugin = (): EventBusPlugin => {
  const plugin: EventBusPlugin = {
    consumeStartHook: (args) => {
      const currentDate = new Date();
      const values: {
        errorStatus: "OK" | "DEPRECATED" | "ERROR" | "GRAPHQL_ERROR";
        durationInMs: number;
      } = {
        errorStatus: "OK",
        durationInMs: 0,
      };
      const logStr = () =>
        `[${new Date().toISOString()}] CONSUME ${args.topic} ${
          values.errorStatus
        } ${values.durationInMs} "${args.metadata["x-request-id"]}" "${
          args.metadata.eventId
        }"`;
      return {
        consumeEndHook: () => {
          console.log(logStr());
        },
        consumeErrorHook: (err) => {
          values.errorStatus = "ERROR";
          values.durationInMs = new Date().getTime() - currentDate.getTime();
          console.error(err);
        },
        consumeGraphQLErrorHooks: () => {
          values.errorStatus = "GRAPHQL_ERROR";
        },
        consumeDeprecatedErrorHooks: () => {
          values.errorStatus = "DEPRECATED";
        },
      };
    },
    publishStartHook: (args) => {
      const values: {
        errorStatus: "OK" | "DEPRECATED" | "ERROR" | "GRAPHQL_ERROR";
        durationInMs: number;
      } = {
        errorStatus: "OK",
        durationInMs: 0,
      };
      const logStr = () =>
        `[${new Date().toISOString()}] PUBLISH ${args.topic} ${
          values.errorStatus
        } ${values.durationInMs} "${args.metadata["x-request-id"]}" "${
          args.metadata.eventId
        }"`;
      return {
        publishEndHook: () => {
          console.log(logStr());
        },
        publishErrorHook: (err) => {
          values.errorStatus = "ERROR";
          console.error(err);
        },
      };
    },
  };
  return plugin;
};
