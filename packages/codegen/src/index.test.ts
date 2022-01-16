import fs from "fs";
import { plugin } from "./index";
import { buildSchema } from "graphql";
import gql from "graphql-tag";
import path from "path";

const typeDef = fs.readFileSync(
  path.join(__dirname, "./event-consumer.graphql"),
  "utf-8"
);

const schemaTypeDef = fs.readFileSync(
  path.join(__dirname, "./schema.graphql"),
  "utf-8"
);

test("plugin", () => {
  const schema = buildSchema(schemaTypeDef);
  const rawDocs = [
    {
      document: gql`
        ${typeDef}
      `,
    },
  ];
  const result = plugin(schema, rawDocs, {
    consumer: {
      contextType: "../file#MyContext",
      schemaPrintPath: "./src/print.graphql",
      eventSampler: true,
    },
    publisher: true,
  });
  fs.writeFileSync("./.tmp.ts", `// @ts-nocheck \n${result}`);
});
