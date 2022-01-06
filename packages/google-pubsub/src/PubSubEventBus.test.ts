import { buildSchema } from "graphql";
import { PubSubEventBus } from "./PubSubEventBus";
import gql from "graphql-tag";
import wait from "waait";

jest.setTimeout(20000);

describe("PubSubEventBus", () => {
  test("works for v0", async () => {
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
      metadata: { "x-prop-meta": "data", version: "v0" },
    });
    await wait(10000);
    await bus.closePublisher();
    await bus.closeConsumer();
    // console.log(cb.mock.calls);
    expect(cb).toBeCalledTimes(1);
    expect(cb.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "fullData": Object {
          "id": "1",
          "name": "coolio",
        },
        "metadata": Object {},
        "payload": Object {
          "id": "1",
        },
        "topic": "TestEvent",
      }
    `);
    await bus.closeConsumer();
    await bus.closePublisher();
  });
  test("works for v1", async () => {
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
              name
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
      metadata: { "x-prop-meta": "data", version: "v1" },
    });
    await wait(10000);
    await bus.closePublisher();
    await bus.closeConsumer();
    // console.log(cb.mock.calls);
    expect(cb).toBeCalledTimes(1);
    expect(cb.mock.calls[0][0]).toMatchObject({
      fullData: {
        id: "1",
        name: "coolio",
      },
      metadata: {
        messageId: expect.any(String),
        "x-prop-meta": "data",
        version: "v1",
      },
      payload: {
        id: "1",
        name: "coolio",
      },
      topic: "TestEvent",
    });
    await bus.closeConsumer();
    await bus.closePublisher();
  });
});
