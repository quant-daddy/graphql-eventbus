import fs from "fs";
import path from "path";
import {
  Source,
  buildSchema,
  GraphQLObjectType,
  isObjectType,
  GraphQLSchema,
  GraphQLInputObjectType,
  isAbstractType,
  isInputObjectType,
} from "graphql";

const generateFieldName = (
  fieldName: string,
  depth: number,
  randomKey: boolean,
) => {
  if (!randomKey) {
    return fieldName;
  }
  if (depth === 1) {
    return fieldName;
  }
  // let result = "";
  // const characters = "abcdefghijklmnopqrstuvwxyz";
  // const charactersLength = characters.length;
  // for (let i = 0; i < 26; i++) {
  //   result += characters.charAt(
  //     Math.floor(Math.random() * charactersLength)
  //   );
  // }
  return fieldName;
  // return `${result}: ${fieldName}`;
};

/**
 * Generate the query for the specified field
 * @param gqlSchema the full schema
 * @param curName name of the field
 * @param parentType parent object
 * @param depth current depth for printing the fields of curName
 */
const generateQuery = ({
  gqlSchema,
  curName,
  parentType,
  depth = 1,
  randomFieldName,
}: {
  gqlSchema: GraphQLSchema;
  curName: string;
  parentType: GraphQLObjectType | GraphQLInputObjectType;
  depth?: number;
  randomFieldName?: boolean;
}) => {
  // console.log(depth);
  if (depth > 10) {
    console.error(Error("Depth limit reached"));
    return "";
  }
  // console.log(`${parentType.name} => ${curName}`);
  const field = parentType.getFields()[curName];
  const curTypeName = field.type.inspect().replace(/[[\]!]/g, "");
  // console.log(`${curName} type: ${curTypeName}`);
  const curType = gqlSchema.getType(curTypeName);
  if (!curType) {
    throw new Error(`curType for ${curName} not found`);
  }
  let queryStr = "";
  let childQuery = "";
  if (isAbstractType(curType)) {
    throw new Error(`abstract types are not supported in event schema`);
  }
  if (isInputObjectType(curType)) {
    throw new Error(`input object types are not supported in event schema`);
  }
  if (!isObjectType(curType)) {
    queryStr = `${"  ".repeat(depth)}${generateFieldName(
      field.name,
      depth,
      !!randomFieldName,
    )}`;
  } else {
    const childKeys = Object.keys(curType.getFields());
    // console.log(childKeys);
    childQuery = childKeys
      // .filter((fieldName) => {
      //   /* Exclude deprecated fields */
      //   const fieldSchema = curType.getFields()[fieldName];
      //   return !fieldSchema.isDeprecated;
      // })
      .map((childKey) => {
        const result = generateQuery({
          curName: childKey,
          gqlSchema,
          parentType: curType,
          depth: depth + 1,
          randomFieldName,
        });
        return result;
      })
      .filter((cur) => cur)
      .join("\n");
    queryStr = `${"  ".repeat(depth)}${generateFieldName(
      field.name,
      depth,
      !!randomFieldName,
    )} {\n${childQuery}\n${"  ".repeat(depth)}}`;
  }
  return queryStr;
};

export const generateQueries = ({
  typeDef,
  print = false,
  randomFieldName,
}: {
  typeDef: string;
  print?: boolean;
  randomFieldName?: boolean;
}): { [key: string]: string } => {
  const source = new Source(typeDef);
  const gqlSchema = buildSchema(source);
  const queryType = gqlSchema.getQueryType();
  if (!queryType) {
    throw new Error("Query type root field not found");
  }
  const QueryFields = Object.keys(queryType.getFields());
  const result: { [key: string]: any } = {};
  for (const rootQueryFieldName of QueryFields) {
    const queryResult = generateQuery({
      gqlSchema,
      curName: rootQueryFieldName,
      parentType: queryType,
      randomFieldName,
    });
    const query = `query ${rootQueryFieldName} {\n${queryResult}\n}`;
    result[rootQueryFieldName] = query;
  }
  if (print) {
    fs.writeFileSync(
      path.join(__dirname, `./data/output.gql`),
      Object.values(result).join("\n"),
    );
  }
  return result;
};
