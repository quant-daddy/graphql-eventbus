import fs from "fs";
import path from "path";
import { Types } from "@graphql-codegen/plugin-helpers";
import {
  GraphQLSchema,
  OperationDefinitionNode,
  print,
  printSchema,
} from "graphql";

interface Config {
  consumer?: {
    contextType: string;
    schemaPrintPath?: string;
    eventSampler?: boolean;
  };
  publisher?: boolean;
}

export const plugin = (
  schema: GraphQLSchema,
  rawDocuments: Types.DocumentFile[],
  config: Config,
) => {
  let exportString = "";
  if (config.publisher) {
    const queryType = schema.getQueryType();
    if (!queryType) {
      throw new Error("You must have Query type to generate publisher code");
    }
    let publisherString: string = Object.entries(queryType.getFields())
      .map(([queryName, queryReturnObject]) => {
        return `    | { topic: "${queryName}", payload: ${
          queryReturnObject.type.inspect().split("!")[0]
        } }`;
      })
      .join("\n");
    publisherString = `function publish(\n${"  ".repeat(
      1,
    )}data:\n${publisherString}\n): Promise<void>;\nfunction publish(): Promise<void>{\n  return Promise.resolve();\n}\n\nexport type Publish = typeof publish`;
    exportString = `${exportString}\n${publisherString}\n`;
  }
  if (config.consumer) {
    if (config.consumer.eventSampler) {
      const queryType = schema.getQueryType();
      if (!queryType) {
        throw new Error("You must have Query type to generate publisher code");
      }
      let eventSamplerString: string = Object.entries(queryType.getFields())
        .map(([queryName, queryReturnObject]) => {
          return `function eventSampler(args: { topic: "${queryName}", override?: Partial<${
            queryReturnObject.type.inspect().split("!")[0]
          }> }): ${queryReturnObject.type.inspect().split("!")[0]}`;
        })
        .join("\n");
      eventSamplerString = `${eventSamplerString}\n;function eventSampler(): {}{\n  return {};\n}\nexport type EventSampler = typeof eventSampler`;
      exportString = `${exportString}\n${eventSamplerString}\n`;
    }
    if (config.consumer.schemaPrintPath) {
      let schemaPath: string;
      if (path.isAbsolute(config.consumer.schemaPrintPath)) {
        schemaPath = config.consumer.schemaPrintPath;
      } else {
        schemaPath = path.join(process.cwd(), config.consumer.schemaPrintPath);
      }
      fs.writeFileSync(schemaPath, printSchema(schema));
    }
    const [contextFile, contextType] = config.consumer.contextType.split("#");
    const importString = `import { ${contextType} } from '${contextFile}'\n`;
    if (rawDocuments.length > 1) {
      throw new Error("You must specify only one document");
    }
    if (!rawDocuments[0].document) {
      throw new Error("Document not found");
    }
    const queries = rawDocuments[0].document.definitions.filter(
      (a): a is OperationDefinitionNode => a.kind === "OperationDefinition",
    );
    const returnTypes = queries.map((a: OperationDefinitionNode) => {
      if (a.operation !== "query") {
        throw new Error(`Event query must be of query type: ${print(a)}`);
      }
      if (!a.name?.value) {
        throw new Error("You must specify the name for each event query");
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
      return [selection.name.value, a.name.value];
    });
    const eventHandlers = returnTypes.map(([eventName, queryName]) => {
      return `${"  "}${eventName}: (msg: ${queryName}Query["${eventName}"], ctx: ${contextType}) => Promise<unknown>`;
    });
    const enumsString = `export enum Events {\n${returnTypes
      .map((a) => `  ${a[0]} = "${a[0]}",`)
      .join("\n")}\n}`;
    exportString = `${importString}${exportString}\n\nexport interface EventHandlers {\n${eventHandlers.join(
      ",\n",
    )}\n}\n${enumsString}`;
  }
  return exportString;
};
