import { validate } from "@graphql-inspector/core";
import {
  DocumentNode,
  GraphQLSchema,
  isObjectType,
  OperationDefinitionNode,
  print,
  Source,
} from "graphql";

export const getTopicsFromDocument = (
  document: DocumentNode,
): { [key: string]: DocumentNode } => {
  const queries = document.definitions.filter(
    (a): a is OperationDefinitionNode => a.kind === "OperationDefinition",
  );
  const topicNames = queries.map((a) => {
    if (a.operation !== "query") {
      throw new Error(`Event query must be of query type: ${print(a)}`);
    }
    // console.log(JSON.stringify(a, null, 2));
    if (a.selectionSet.selections.length > 1) {
      throw new Error(
        `You must specify unique event queries: ${JSON.stringify(
          a.selectionSet.selections,
        )}`,
      );
    }
    const selection = a.selectionSet.selections[0];
    if (selection.kind !== "Field") {
      throw new Error(`Invalid query ${print(a)}`);
    }
    return selection.name.value;
  });
  if (Array.from(new Set(topicNames)).length < topicNames.length) {
    throw new Error("You must specify unique events");
  }
  return queries.reduce((acc, cur, curIndex) => {
    return {
      ...acc,
      [topicNames[curIndex]]: cur,
    };
  }, {});
};

export const getRootQueryFields = (schema: GraphQLSchema): string[] => {
  const queryType = schema.getQueryType();
  if (!queryType) {
    throw new Error("Root query not found");
  }
  const queryFields = queryType.getFields();
  // We enforce non null payload to use graphql typescript code generation fields.
  if (
    !Object.values(queryFields).every((a) => a.type.inspect().endsWith("!"))
  ) {
    throw new Error("All events must have a non null payload");
  }
  const returnTypes = Object.values(queryFields).map((a) => a.type.toString());
  for (const returnType of returnTypes) {
    const type = schema.getType(returnType.split("!")[0]);
    if (!isObjectType(type)) {
      throw new Error("You must return objects for events");
    }
  }
  return Object.keys(queryFields);
};

export const validateQuery = (schema: GraphQLSchema, query: DocumentNode) => {
  const result = validate(schema, [new Source(print(query))]);
  if (result.length > 0 && result.find((a) => a.errors.length > 0)) {
    throw new Error(
      `Invalid queries found: ${JSON.stringify(result, null, 2)}`,
    );
  }
};
