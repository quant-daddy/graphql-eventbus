import {
  getRootQueryFields,
  getTopicsFromDocument,
  validateQueries,
} from "./eventbus-utils";

import fs from "fs";
import { buildSchema } from "graphql";
import path from "path";
import gql from "graphql-tag";

const typeDef = fs.readFileSync(
  path.join(__dirname, "../data/events.graphql"),
  "utf-8"
);

const publisherSchema = buildSchema(typeDef);

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
  test("Disallow mutation", () => {
    expect(() =>
      getTopicsFromDocument(gql`
        mutation whatver {
          cool
        }
      `)
    ).toThrowErrorMatchingInlineSnapshot(`
"Event query must be of query type: mutation whatver {
  cool
}"
`);
  });
  test("Single query within a query", () => {
    expect(() =>
      getTopicsFromDocument(gql`
        query whatver {
          cool
          cool
        }
      `)
    ).toThrow();
  });
});

describe("Query validation", () => {
  test("works 2", () => {
    expect(() =>
      validateQueries(publisherSchema, [
        gql`
          query Complex {
            Complex {
              id
            }
          }

          query ClosedGroupJoinRequestResponseEvent {
            ClosedGroupJoinRequestResponseEvent {
              id
            }
          }
        `,
      ])
    ).not.toThrow();
  });
  test("works", () => {
    expect(() =>
      validateQueries(publisherSchema, [
        gql`
          query complex {
            A: SignUpEvent {
              id
            }
            B: SignUpEvent {
              id
            }
          }
        `,
      ])
    ).not.toThrow();
  });
  test("Invalid event query throws", () => {
    expect(() =>
      validateQueries(publisherSchema, [
        gql`
          query bad {
            bad {
              name
            }
          }
        `,
      ])
    ).toThrow();
  });
  test("Deprecated field query logs warning", () => {
    expect(() =>
      validateQueries(publisherSchema, [
        gql`
          query complex {
            Complex {
              groupId
            }
          }
        `,
      ])
    ).not.toThrow();
  });
});

describe("getRootQueryNames", () => {
  test("works", () => {
    const schema = buildSchema(typeDef);
    const topicNames = getRootQueryFields(schema);
    expect(topicNames).toMatchInlineSnapshot(`
      Array [
        "Complex",
        "B",
        "C",
        "ClosedGroupJoinRequestResponseEvent",
        "SignUpEvent",
        "EntityFlagEvent",
      ]
    `);
  });
  // test("Each root return type has and id and timestamp", () => {
  //   const badSchema =
  // })
  test("Nullable return type throws", () => {
    const badSchema = buildSchema(`
      type Query {
        A: String!
        B: String
      }
    `);
    expect(() =>
      getRootQueryFields(badSchema)
    ).toThrowErrorMatchingInlineSnapshot(
      `"You must specify all queries with non null response type"`
    );
  });
});
