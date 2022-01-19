import fs from "fs";
import path from "path";
import gql from "graphql-tag";
import { validate } from "graphql/validation";
import { generateQueries } from "./generateQueries";
import { buildSchema } from "graphql";

const typeDef = fs.readFileSync(
  path.join(__dirname, "../data/events.graphql"),
  "utf-8",
);

describe("generateQuery", () => {
  test("works", () => {
    const result = generateQueries({ typeDef });
    const r = gql`
      ${result["Complex"]}
    `;
    const errors = validate(buildSchema(typeDef), r);
    expect(errors.length).toBe(0);
  });
});
