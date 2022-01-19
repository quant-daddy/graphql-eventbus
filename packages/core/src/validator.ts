import { print } from "graphql/language/printer";
// import { validate } from "@graphql-inspector/core";
import { validate } from "@graphql-inspector/core";
import {
  DocumentNode,
  GraphQLSchema,
  graphqlSync,
  printSchema,
  Source,
} from "graphql";
import { generateQueries } from "./generateQueries";

export class Validator {
  private allQueries!: { [key: string]: string };
  private rootQueryFieldQueries!: { [key: string]: string };

  constructor(public schema: GraphQLSchema) {
    const sdl = printSchema(schema);
    this.allQueries = generateQueries({
      typeDef: sdl,
      print: false,
      randomFieldName: false,
    });
    this.rootQueryFieldQueries = generateQueries({
      typeDef: sdl,
      print: false,
      randomFieldName: true,
    });
  }

  /**
   * When publishing message, validate the data against generated query
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  validate = (topic: string, data: {}) => {
    if (Object.keys(this.rootQueryFieldQueries).indexOf(topic) === -1) {
      throw new Error("Invalid key");
    }
    const result = graphqlSync(this.schema, this.rootQueryFieldQueries[topic], {
      [topic]: data,
    });
    if (result.errors) {
      throw new Error(JSON.stringify(result.errors, null, 2));
    }
    return result;
  };

  /**
   * When consuming data, only extract fields that you need from the payload
   * @param query GraphQL query for the data
   * @param key Name of the event or root query field name
   * @param data the data to resolve the query
   */
  extract = (
    query: DocumentNode,
    topic: string,
    // eslint-disable-next-line @typescript-eslint/ban-types
    data: {},
  ) => {
    const printedQuery = print(query);
    const deprecatedFields = validate(this.schema, [new Source(printedQuery)], {
      strictDeprecated: true,
    })[0];
    const payload = graphqlSync(this.schema, printedQuery, {
      [topic]: data,
    });
    return {
      payload,
      errors: payload.errors,
      deprecated: deprecatedFields?.deprecated,
    };
  };

  /**
   * Sample data for consumer testing purposes
   * Needs the schema to have mock resolvers
   */
  sample = (eventKey: string) => {
    return JSON.parse(
      JSON.stringify(graphqlSync(this.schema, this.allQueries[eventKey])),
    );
  };
}
