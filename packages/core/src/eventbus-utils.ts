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
  document: DocumentNode
): { [key: string]: DocumentNode } => {
  const queries = document.definitions.filter(
    (a): a is OperationDefinitionNode =>
      a.kind === "OperationDefinition"
  );
  const topicNames = queries.map((a) => {
    if (a.operation !== "query") {
      throw new Error(
        `Event query must be of query type: ${print(a)}`
      );
    }
    // console.log(JSON.stringify(a, null, 2));
    if (a.selectionSet.selections.length > 1) {
      throw new Error(
        `You must specify unique event queries: ${JSON.stringify(
          a.selectionSet.selections
        )}`
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

// const validateObject = (type: GraphQLNamedType) => {
//   if (!isObjectType(type)) {
//     throw new Error("Return type must be an object");
//   }
//   // const fieldNames = Object.keys(type.getFields());
//   // if (fieldNames.indexOf("id") === -1) {
//   //   throw new Error("You must specify an id field for event payload");
//   // }
//   // if (fieldNames.indexOf("timestamp") === -1) {
//   //   throw new Error(
//   //     "You must specify an timestamp field for event payload"
//   //   );
//   // }
//   // Object.values(type.getFields()).forEach((a) => {
//   //   if (a.name === "id" && a.type.inspect() !== "UUID!") {
//   //     throw new Error("id field must be of type UUID!");
//   //   }
//   //   if (a.name === "timestamp" && a.type.inspect() !== "DateTime!") {
//   //     throw new Error("timestamp field must be of type DateTime!");
//   //   }
//   // });
// };

export const getRootQueryFields = (
  schema: GraphQLSchema
): string[] => {
  const queryType = schema.getQueryType();
  if (!queryType) {
    throw new Error("Root query not found");
  }
  const queryFields = queryType.getFields();
  // console.log(queryFields);
  if (
    !Object.values(queryFields).every((a) =>
      a.type.inspect().endsWith("!")
    )
  ) {
    throw new Error(
      "You must specify all queries with non null response type"
    );
  }
  const returnTypes = Object.values(queryFields).map((a) =>
    a.type.toString()
  );
  for (const returnType of returnTypes) {
    const type = schema.getType(returnType.split("!")[0]);
    if (!isObjectType(type)) {
      throw new Error("You must return objects for events");
    }
    // console.log(JSON.stringify(type?.astNode, null, 2));
  }
  return Object.keys(queryFields);
};

export const validateQueries = (
  schema: GraphQLSchema,
  queries: DocumentNode[]
) => {
  const result = validate(
    schema,
    queries.map((a) => new Source(print(a)))
  );
  if (result.length > 0 && result.find((a) => a.errors.length > 0)) {
    throw new Error(
      `Invalid queries found: ${JSON.stringify(result, null, 2)}`
    );
  }
  if (
    result.length > 0 &&
    result.find((a) => a.deprecated.length > 0)
  ) {
    console.warn(
      `Deprecated fields found: ${JSON.stringify(
        result.map((a) => a.deprecated),
        null,
        2
      )}`
    );
  }
};
