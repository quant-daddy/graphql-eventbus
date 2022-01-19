import {
  getRootQueryFields,
  getTopicsFromDocument,
  validateQuery,
} from "./eventbus-utils";
import { buildSchema } from "graphql";
import gql from "graphql-tag";

describe("getTopicsFromDocument", () => {
  test("works", () => {
    const result = getTopicsFromDocument(gql`
      query C {
        C {
          id
        }
      }
      query B {
        some {
          ...Cool
        }
      }
      fragment Cool on Cool {
        name
      }
    `);
    expect(Object.keys(result)).toMatchInlineSnapshot(`
      Array [
        "C",
        "some",
      ]
    `);
  });
  test("Mutation field is not allowed with a chema", () => {
    expect(() =>
      getTopicsFromDocument(gql`
        mutation whatver {
          cool
        }
      `),
    ).toThrowErrorMatchingInlineSnapshot(`
"Event query must be of query type: mutation whatver {
  cool
}"
`);
  });
  test("Only a single event can be queried within a query", () => {
    expect(() =>
      getTopicsFromDocument(gql`
        query whatver {
          cool
          cool
        }
      `),
    ).toThrow();
  });
});

describe("Query validation", () => {
  test("works 2", () => {
    expect(() =>
      validateQuery(
        buildSchema(`
          type EventA {
            id: ID!
          }
          type EventB {
            id: ID!
          }
          type Query {
            EventA: EventA!
            EventB: EventB!
          }
        `),
        gql`
          query EventA {
            EventA {
              id
            }
          }

          query EventB {
            EventB {
              id
            }
          }
        `,
      ),
    ).not.toThrow();
  });
  test("renaming fields work", () => {
    expect(() =>
      validateQuery(
        buildSchema(`
          type EventA {
            id: ID!
          }
          type EventB {
            id: ID!
          }
          type Query {
            EventA: EventA!
            EventB: EventB!
          }
        `),
        gql`
          query EventA {
            A: EventA {
              id
            }
          }
        `,
      ),
    ).not.toThrow();
  });
});

describe("getRootQueryNames", () => {
  test("works", () => {
    const topicNames = getRootQueryFields(
      buildSchema(`
        type EventA {
          id: ID!
        }
        type EventB {
          count: Int
        }
        type Query {
          EventA: EventA!
          EventB: EventB!
        }
      `),
    );
    expect(topicNames).toMatchInlineSnapshot(`
      Array [
        "EventA",
        "EventB",
      ]
    `);
  });
  test("Nullable event payload throws", () => {
    const badSchema = buildSchema(`
      type EventA {
        id: ID!
      }
      type Query {
        EventA: EventA
      }
    `);
    expect(() =>
      getRootQueryFields(badSchema),
    ).toThrowErrorMatchingInlineSnapshot(
      `"All events must have a non null payload"`,
    );
  });
});
