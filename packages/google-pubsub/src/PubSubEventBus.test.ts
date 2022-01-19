import { buildSchema } from "graphql";
import { PubSubEventBus } from "./PubSubEventBus";
import gql from "graphql-tag";
import wait from "waait";

jest.setTimeout(20000);

describe("PubSubEventBus", () => {
  test("works", async () => {
    if (process.env.CI !== "true") {
      console.log("skipping PubSubEventBus test");
      return;
    }
    const schema = buildSchema(`
    type TestEvent {
      id: ID!
      name: String
    }
    type Query {
      TestEvent: TestEvent!
    }
  `);
    const cb = jest.fn();
    const bus = new PubSubEventBus({
      serviceName: "test",
      publisher: {
        schema,
      },
      subscriber: {
        cb: async (...args) => {
          return cb(...args);
        },
        queries: gql`
          query TestEvent {
            TestEvent {
              id
            }
          }
        `,
        schema,
      },
    });
    await bus.init();
    cb.mockClear();
    await bus.publish({
      topic: "TestEvent",
      payload: { id: "1", name: "coolio" },
    });
    await wait(10000);
    await bus.closePublisher();
    await bus.closeConsumer();
    // console.log(cb.mock.calls);
    expect(cb).toBeCalledTimes(1);
    expect(cb.mock.calls[0][0]).toMatchObject({
      _fullData: {
        id: "1",
        name: "coolio",
      },
      metadata: {},
      payload: {
        id: "1",
      },
      topic: "TestEvent",
    });
    await bus.closeConsumer();
    await bus.closePublisher();
  });
});
