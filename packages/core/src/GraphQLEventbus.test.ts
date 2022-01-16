import { buildSchema } from "graphql";
import gql from "graphql-tag";
import { GraphQLEventbus } from "./GraphQLEventbus";
import { DataCb } from "./GraphQLEventbus";

const pubSchema = buildSchema(`
    type TestEvent {
      id: ID!
      name: String
    }
    type TestEvent2 {
      id: ID!
      address: String @deprecated(reason: "Please do not use")
      count: Int
    }
    type Query {
      TestEvent: TestEvent!
      TestEvent2: TestEvent2!
    }
  `);

test("valid event is published", async () => {
  const publishCb = jest.fn();
  const publishErrorCb = jest.fn();
  const publishStartCb = jest.fn();
  const bus = new GraphQLEventbus({
    plugins: [
      {
        publishStartHook: (a) => {
          publishStartCb(a.topic);
          return {
            publishErrorHook: () => publishErrorCb(a.topic),
          };
        },
      },
    ],
    publisher: {
      schema: pubSchema,
      publish: async (d) => {
        publishCb(d);
      },
    },
  });
  await bus.init();
  await bus.publish({
    topic: "TestEvent",
    payload: {
      id: "123",
      name: "name",
    },
    metadata: {
      a: "b",
    },
  });
  expect(publishCb).toBeCalledTimes(1);
  expect(publishCb.mock.calls[0][0]).toMatchObject({
    baggage: {
      metadata: {
        a: "b",
      },
      payload: {
        id: "123",
        name: "name",
      },
    },
    topic: "TestEvent",
  });
  const errorCb = jest.fn();
  await bus
    .publish({
      topic: "NonExistingEvent",
      payload: {
        id: "123",
        name: "name",
      },
    })
    .catch((e) => {
      errorCb();
    });
  expect(errorCb).toBeCalled();
  expect(publishStartCb).toBeCalledTimes(2);
  expect(publishErrorCb).toBeCalledTimes(1);
});

test("Allow invalid topic publishing", async () => {
  const publishCb = jest.fn();
  const bus = new GraphQLEventbus({
    publisher: {
      schema: pubSchema,
      publish: async (d) => {
        publishCb(d);
      },
      allowInvalidTopic: true,
    },
  });
  await bus.init();
  await bus.publish({
    topic: "NonExistingTopic",
    payload: {},
  });
});

test("valid events are consumed and hooks are called", async () => {
  const consumeCb = jest.fn();
  let cbRef!: DataCb;
  const consumeErrCb = jest.fn();
  const consumeStartCb = jest.fn();
  const consumeEndCb = jest.fn();
  const consumeDeprecatedErrorCb = jest.fn();
  const consumeGraphQLErrorCb = jest.fn();
  const bus = new GraphQLEventbus({
    plugins: [
      {
        consumeStartHook: (a) => {
          consumeStartCb(a.topic);
          return {
            consumeErrorHook: (e) => consumeErrCb(a.topic, e.message),
            consumeEndHook: () => {
              consumeEndCb(a.topic);
            },
            consumeDeprecatedErrorHooks: (e) => {
              consumeDeprecatedErrorCb(e);
            },
            consumeGraphQLErrorHooks: (e) => {
              consumeGraphQLErrorCb(e);
            },
          };
        },
      },
    ],
    subscriber: {
      cb: consumeCb,
      subscribe: async (t, cb) => {
        cbRef = cb;
      },
      queries: gql`
        query TestEvent {
          TestEvent {
            id
            name
          }
        }
        query TestEvent2 {
          TestEvent2 {
            id
            address
            count
          }
        }
      `,
      schema: pubSchema,
    },
  });
  await bus.init();
  await cbRef({
    topic: "TestEvent2",
    baggage: {
      payload: {
        id: "id",
        address: "address",
      },
      metadata: {} as any,
    },
  });
  expect(consumeCb).toBeCalledTimes(1);
  expect(consumeCb.mock.calls[0][0]).toMatchObject({
    metadata: {},
    payload: {
      id: "id",
      address: "address",
    },
    topic: "TestEvent2",
  });
  expect(consumeStartCb).toBeCalledTimes(1);
  expect(consumeErrCb).toBeCalledTimes(0);
  expect(consumeEndCb).toBeCalledTimes(1);
  expect(consumeDeprecatedErrorCb).toBeCalledTimes(1);
  consumeErrCb.mockClear();
  consumeEndCb.mockClear();
  consumeStartCb.mockClear();
  consumeDeprecatedErrorCb.mockClear();
  try {
    // error in the payload
    await cbRef({
      topic: "TestEvent2",
      baggage: {
        payload: {
          id: "123",
          count: "NOT_A_NUMBER",
        },
        metadata: {} as any,
      },
    });
  } catch (e) {}
  expect(consumeStartCb).toBeCalledTimes(1);
  expect(consumeEndCb).toBeCalledTimes(1);
  expect(consumeErrCb).toBeCalledTimes(0);
  expect(consumeGraphQLErrorCb).toBeCalledTimes(1);
});
