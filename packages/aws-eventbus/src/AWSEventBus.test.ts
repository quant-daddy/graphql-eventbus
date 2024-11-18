import { buildSchema } from "graphql";
import { AWSEventBus } from "./AWSEventBus";
import gql from "graphql-tag";
import wait from "waait";

jest.setTimeout(60000);

describe("AWSEventBus", () => {
  test("works", async () => {
    // if (process.env.CI !== "true") {
    //   console.log("skipping AWSEventBus test");
    //   return;
    // }
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
    const bus = new AWSEventBus({
      region: "us-east-1",
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
    await wait(15000);
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
  test("dark release does not receive event without attribute", async () => {
    // if (process.env.CI !== "true") {
    //   console.log("skipping AWSEventBus test");
    //   return;
    // }
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
    const bus = new AWSEventBus({
      region: "us-east-1",
      serviceName: "test",
      publisher: {
        schema,
      },
      isDarkRelease: true,
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
    await wait(15000);
    await bus.closePublisher();
    await bus.closeConsumer();
    // console.log(cb.mock.calls);
    expect(cb).not.toBeCalled();
  });
  test("dark release does receive event with dark attribute", async () => {
    // if (process.env.CI !== "true") {
    //   console.log("skipping AWSEventBus test");
    //   return;
    // }
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
    const bus = new AWSEventBus({
      region: "us-east-1",
      serviceName: "test",
      publisher: {
        schema,
      },
      isDarkRelease: true,
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
      attributes: {
        "x-prop-test-dark": "true",
      },
    });
    await wait(15000);
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
