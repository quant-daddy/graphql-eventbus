import { print } from "graphql/language/printer";
// import { validate } from "@graphql-inspector/core";
import { NoDeprecatedCustomRule, validate } from "graphql";
import { DocumentNode, GraphQLSchema, graphqlSync, printSchema } from "graphql";
import { generateQueries } from "./generateQueries";

export class Validator<
  RootQuery extends Record<string, unknown> = { [key: string]: unknown },
> {
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
  validate = <T extends Exclude<keyof RootQuery, "__typename">>(
    topic: T,
    data: unknown,
  ) => {
    if (
      Object.keys(this.rootQueryFieldQueries).indexOf(topic as string) === -1
    ) {
      throw new Error("Invalid key");
    }
    const result = graphqlSync({
      schema: this.schema,
      // @ts-ignore this is inforced at runtime by the check above
      source: this.rootQueryFieldQueries[topic],
      rootValue: {
        [topic]: data,
      },
    });
    if (result.errors) {
      throw new Error(JSON.stringify(result.errors, null, 2));
    }
    if (!result.data) {
      throw new Error("No data found");
    }
    // @ts-ignore the rootValue about has this key
    return result.data[topic] as RootQuery[T];
  };

  /**
   * When consuming data, only extract fields that you need from the payload
   * @param query GraphQL query for the data
   * @param key Name of the event or root query field name
   * @param data the data to resolve the query
   */
  extract = <T extends Exclude<keyof RootQuery, "__typename">>(
    query: DocumentNode,
    topic: T,
    // eslint-disable-next-line @typescript-eslint/ban-types
    data: {},
  ) => {
    const printedQuery = print(query);
    const deprecatedFields = validate(this.schema, query, [
      NoDeprecatedCustomRule,
    ]);
    const payload = graphqlSync({
      schema: this.schema,
      source: printedQuery,
      rootValue: {
        [topic]: data,
      },
    });
    return {
      payload,
      errors: payload.errors,
      deprecated: deprecatedFields,
    };
  };

  /**
   * Sample data for consumer testing purposes
   * Needs the schema to have mock resolvers
   */
  sample = (eventKey: keyof RootQuery) => {
    return JSON.parse(
      JSON.stringify(
        graphqlSync({
          schema: this.schema,
          // @ts-ignore
          source: this.allQueries[eventKey],
        }),
      ),
    );
  };
}
