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
  const result = plugin(
    buildSchema(schemaTypeDef),
    [
      {
        document: gql`
          ${typeDef}
        `,
      },
    ],
    {
      consumer: {
        contextType: "../file#MyContext",
        schemaPrintPath: "./src/print.graphql",
        eventSampler: true,
      },
      publisher: true,
    }
  );
  fs.writeFileSync("./.tmp.ts", result);
});
