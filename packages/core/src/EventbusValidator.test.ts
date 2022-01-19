import { EventBusValidator } from "./EventBusValidator";
import { buildSchema, print } from "graphql";
import gql from "graphql-tag";

const typeDef = gql`
  enum EventType {
    CREATE
    UPDATE
  }

  type EventA {
    id: ID!
    name: String @deprecated(reason: "Do not use this field")
    type: EventType
  }

  type Query {
    EventA: EventA!
  }
`;

const publisherSchema = buildSchema(print(typeDef));

describe("EventBusValidator", () => {
  test("consumer extracts data for queried field", async () => {
    const queries = gql`
      query EventA {
        EventA {
          id
          name
        }
      }
    `;
    const validator = new EventBusValidator({
      publisherSchema,
    });
    await validator.validateConsumerQueries(queries);
    const result = await validator.extractData({
      topic: "EventA",
      data: {
        id: "123",
        name: "Dan Schafer",
        type: "CREATE",
      },
    });
    expect(result.data).toMatchInlineSnapshot(`
      Object {
        "id": "123",
        "name": "Dan Schafer",
      }
    `);
  });
  test("consumer does not throw error for missing field in payload if it is not queried", async () => {
    const queries = gql`
      query EventA {
        EventA {
          id
          name
        }
      }
    `;
    const validator = new EventBusValidator({
      publisherSchema,
    });
    await validator.validateConsumerQueries(queries);
    const result = await validator.extractData({
      topic: "EventA",
      data: {
        id: "123",
        name: "Dan Schafer",
      },
    });
    expect(result.data).toMatchInlineSnapshot(`
      Object {
        "id": "123",
        "name": "Dan Schafer",
      }
    `);
  });
  test("consumer detects deprecated field", async () => {
    const queries = gql`
      query EventA {
        EventA {
          id
          name
        }
      }
    `;
    const validator = new EventBusValidator({
      publisherSchema,
    });
    await validator.validateConsumerQueries(queries);
    const result = await validator.extractData({
      topic: "EventA",
      data: {
        id: "123",
        name: "Dan Schafer",
      },
    });
    expect(result.deprecated?.[0].message).toMatchInlineSnapshot(
      `"The field 'EventA.name' is deprecated. Do not use this field"`,
    );
  });
  test("consumer throws error for required field if not present in payload", async () => {
    const queries = gql`
      query EventA {
        EventA {
          id
          name
        }
      }
    `;
    const consumerEventBus = new EventBusValidator({
      publisherSchema,
    });
    await consumerEventBus.validateConsumerQueries(queries);
    const result = await consumerEventBus.extractData({
      topic: "EventA",
      data: {
        name: "Dan Schafer",
      },
    });
    expect(result).toMatchObject({
      data: null,
    });
    expect(result.errors?.[0].message).toMatchInlineSnapshot(
      `"Cannot return null for non-nullable field EventA.id."`,
    );
  });
  test("consumer set value null and returns error for non-valid field value of a not-required field", async () => {
    const queries = gql`
      query EventA {
        EventA {
          id
          type
        }
      }
    `;
    const consumerEventBus = new EventBusValidator({
      publisherSchema,
    });
    await consumerEventBus.validateConsumerQueries(queries);
    const result = await consumerEventBus.extractData({
      topic: "EventA",
      data: {
        name: "Dan Schafer",
        id: "123",
        type: "INVALID",
      },
    });
    expect(result).toMatchObject({
      data: {
        id: "123",
        type: null,
      },
    });
    expect(result.errors?.[0].message).toMatchInlineSnapshot(
      `"Enum \\"EventType\\" cannot represent value: \\"INVALID\\""`,
    );
  });
  test("consumer throws error for non-valid field value for a required field", async () => {
    const consumerEventBus = new EventBusValidator({
      publisherSchema: buildSchema(`
        type EventB {
          count: Int!
          id: ID!
        }
        type Query {
          EventB: EventB!
        }
      `),
    });
    await consumerEventBus.validateConsumerQueries(gql`
      query EventB {
        EventB {
          id
          count
        }
      }
    `);
    const result = await consumerEventBus.extractData({
      topic: "EventB",
      data: {
        id: "123",
        count: "INVALID",
      },
    });
    expect(result).toMatchObject({
      data: null,
    });
    expect(result.errors?.[0].message).toMatchInlineSnapshot(
      `"Int cannot represent non-integer value: \\"INVALID\\""`,
    );
  });
  test("consumer throws for consuming non existing topic", async () => {
    const queries = gql`
      query NonExisting {
        NonExisting {
          id
          name
        }
      }
    `;
    const consumerEventBus = new EventBusValidator({
      publisherSchema,
    });
    const errCb = jest.fn();
    try {
      await consumerEventBus.validateConsumerQueries(queries);
    } catch (e) {
      errCb(e);
    }
    expect(errCb).toBeCalled();
  });
  test("publisher works for missing not-required field", async () => {
    const eventBusValidator = new EventBusValidator({
      publisherSchema: buildSchema(`
        type EventA {
          id: ID!
          name: String
        }
        type Query {
          EventA: EventA!
        }
      `),
    });
    await expect(
      eventBusValidator.publishValidate({
        topic: "EventA",
        payload: {
          id: "123",
        },
      }),
    ).resolves;
  });
  test("publisher works for full payload", async () => {
    const eventBusValidator = new EventBusValidator({
      publisherSchema: buildSchema(`
      type EventA {
        id: ID!
        name: String
      }
      type Query {
        EventA: EventA!
      }
    `),
    });
    await expect(
      eventBusValidator.publishValidate({
        topic: "EventA",
        payload: {
          id: "123",
          name: "Lee Byron",
        },
      }),
    ).resolves;
  });
  test("publisher throw for publishing non-existing event", async () => {
    const eventBusValidator = new EventBusValidator({
      publisherSchema: buildSchema(`
      type EventA {
        id: ID!
        name: String
      }
      type Query {
        EventA: EventA!
      }
    `),
    });
    const errCb = jest.fn();
    try {
      await eventBusValidator.publishValidate({
        topic: "NonExinstingEvent",
        payload: {
          name: "Lee Byron",
        },
      });
    } catch (e) {
      errCb(e);
    }
    expect(errCb).toBeCalledTimes(1);
  });
  test("publisher throw for missing required field", async () => {
    const eventBusValidator = new EventBusValidator({
      publisherSchema: buildSchema(`
      type EventA {
        id: ID!
        name: String
      }
      type Query {
        EventA: EventA!
      }
    `),
    });
    const errCb = jest.fn();
    try {
      await eventBusValidator.publishValidate({
        topic: "EventA",
        payload: {
          name: "Lee Byron",
        },
      });
    } catch (e) {
      errCb(e);
    }
    expect(errCb).toBeCalledTimes(1);
  });
});
