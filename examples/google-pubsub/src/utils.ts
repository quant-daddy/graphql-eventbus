import {
  DateTimeResolver,
  EmailAddressResolver,
  UUIDResolver,
} from "graphql-scalars";
import fs from "fs";
import { makeExecutableSchema } from "@graphql-tools/schema";
import gql from "graphql-tag";

export const getSchema = (location: string) => {
  const eventTypeDefs = fs.readFileSync(location, {
    encoding: "utf-8",
  });
  const typeDefs = gql`
    ${eventTypeDefs}
  `;
  const resolvers = {
    UUID: UUIDResolver,
    DateTime: DateTimeResolver,
    EmailAddress: EmailAddressResolver,
  };
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });
  return schema;
};
