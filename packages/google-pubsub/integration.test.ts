import { buildSchema } from "graphql";
import { LoggingPlugin } from "graphql-eventbus";
import gql from "graphql-tag";
import wait from "waait";
import { PubSubEventBus } from "./dist/index";

describe("Google Pubsub integration test", () => {
  test("publist topics are created", async () => {
    const schema = buildSchema(`
    type TopicA {
      id: String!
    }
    type Query {
      TopicA: TopicA!
    }
  `);
    const cb = jest.fn();
    const bus = new PubSubEventBus({
      serviceName: "test",
      publisher: {
        schema,
      },
      subscriber: {
        cb: async (p) => {
          cb(p.payload);
          return;
        },
        queries: gql`
          query TopicA {
            TopicA {
              id
            }
          }
        `,
        schema,
      },
      plugins: [LoggingPlugin()],
    });
    await bus.init();
    await bus.publish({
      topic: "TopicA",
      payload: {
        id: "myid",
      },
    });
    await wait(1000);
    expect(cb).toBeCalledTimes(1);
  });
});
