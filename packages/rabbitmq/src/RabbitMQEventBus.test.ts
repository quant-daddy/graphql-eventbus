import { buildSchema } from "graphql";
import { RabbitMQEventBus } from "./RabbitMQEventBus";
import gql from "graphql-tag";
import wait from "waait";
import { LoggingPlugin } from "graphql-eventbus-core";

jest.setTimeout(30000);

describe("RabbitMQEventBus", () => {
  test("works", async () => {
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
    const bus = new RabbitMQEventBus({
      serviceName: "test-7",
      plugins: [LoggingPlugin],
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
    // wait for consumer queur to be initialized
    await wait(5000);
    cb.mockClear();
    await bus.publish({
      topic: "TestEvent",
      payload: { id: "1", name: "coolio" },
    });
    await wait(5000);
    await bus.closePublisher();
    await bus.closeConsumer();
    // console.log(cb.mock.calls);
    expect(cb).toBeCalledTimes(1);
    expect(cb.mock.calls[0][0]).toMatchObject({
      fullData: {
        id: "1",
        name: "coolio",
      },
      metadata: {},
      payload: {
        id: "1",
      },
      topic: "TestEvent",
    });
  });
  // test("works for v1", async () => {
  //   const schema = buildSchema(`
  //   type TestEvent {
  //     id: ID!
  //     name: String
  //   }
  //   type Query {
  //     TestEvent: TestEvent!
  //   }
  // `);
  //   const cb = jest.fn();
  //   const bus = new RabbitMQEventBus({
  //     serviceName: "test",
  //     publisher: {
  //       schema,
  //     },
  //     subscriber: {
  //       cb: async (...args) => {
  //         return cb(...args);
  //       },
  //       queries: gql`
  //         query TestEvent {
  //           TestEvent {
  //             id
  //             name
  //           }
  //         }
  //       `,
  //       schema,
  //     },
  //   });
  //   await bus.init();
  //   cb.mockClear();
  //   await bus.publish({
  //     topic: "TestEvent",
  //     payload: { id: "1", name: "coolio" },
  //   });
  //   await wait(10000);
  //   await bus.closePublisher();
  //   await bus.closeConsumer();
  //   // console.log(cb.mock.calls);
  //   expect(cb).toBeCalledTimes(1);
  //   expect(cb.mock.calls[0][0]).toMatchObject({
  //     fullData: {
  //       id: "1",
  //       name: "coolio",
  //     },
  //     metadata: {
  //       messageId: expect.any(String),
  //       "x-prop-meta": "data",
  //       version: "v1",
  //     },
  //     payload: {
  //       id: "1",
  //       name: "coolio",
  //     },
  //     topic: "TestEvent",
  //   });
  //   await bus.closeConsumer();
  //   await bus.closePublisher();
  // });
});
