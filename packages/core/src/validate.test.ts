import fs from "fs";
import { makeExecutableSchema } from "@graphql-tools/schema";
import {
  UUIDResolver,
  DateTimeResolver,
  EmailAddressResolver,
  mocks,
} from "graphql-scalars";
import path from "path";
import { addMocksToSchema, MockStore } from "@graphql-tools/mock";
import { gql } from "graphql-tag";
import { Validator } from "./validator";
import { v4 } from "uuid";

const typeDefs = fs.readFileSync(
  path.join(__dirname, "../data/events.graphql"),
  {
    encoding: "utf-8",
  },
);

const builtSchema = makeExecutableSchema({
  typeDefs,
  resolvers: {
    DateTime: DateTimeResolver,
    EmailAddress: EmailAddressResolver,
    UUID: UUIDResolver,
  },
});

const mockSchema = addMocksToSchema({
  schema: builtSchema,
  mocks,
});

const validator = new Validator(mockSchema);

describe("validate", () => {
  test("correct data does not throw", async () => {
    const key = "ClosedGroupJoinRequestResponseEvent";
    const data = validator.sample("ClosedGroupJoinRequestResponseEvent");
    validator.validate(key, data.data[key]);
  });
  test("incorrect data throws", async () => {
    const key = "ClosedGroupJoinRequestResponseEvent";
    const data = {
      id: "12321",
    };
    expect(() => validator.validate(key, data)).toThrow();
  });
  test("incorrect enum throws", async () => {
    const key = "B";
    const data = {
      id: v4(),
      timestamp: new Date().toISOString(),
      name: "name",
      status: "ACCEPED",
    };
    expect(() => validator.validate(key, data)).toThrow();
  });
  test("incorrect nonUUID throws", async () => {
    const key = "EntityFlagEvent";
    const data = validator.sample(key).data[key] as any;
    data.entityId = "non-uuid";
    expect(() => validator.validate(key, data)).toThrow();
  });
});

describe("decodeData", () => {
  test("correct data works", async () => {
    const key = "ClosedGroupJoinRequestResponseEvent";
    const data = validator.sample(key).data[key];
    const query = gql`
      query {
        boom: ClosedGroupJoinRequestResponseEvent {
          renameId: id
          ...A
        }
      }
      fragment A on ClosedGroupJoinRequestResponseEvent {
        requestedByUserId
        status
      }
    `;
    const result = validator.extract(query, key, data);
    expect(result.payload.data).toMatchObject({
      boom: {
        renameId: data.id,
        requestedByUserId: data.requestedByUserId,
      },
    });
  });
  test("invalid enum throws", async () => {
    const key = "EntityFlagEvent";
    const data = validator.sample(key).data[key];
    const query = gql`
      query {
        EntityFlagEvent {
          entityType
          timestamp
        }
      }
    `;
    const result = validator.extract(query, key, {
      ...data,
      entityType: "INVALID",
    });
    expect(result.payload.data).toMatchObject({
      EntityFlagEvent: {
        entityType: null,
        timestamp: expect.any(Date),
      },
    });
  });
});

describe("sample", () => {
  test("correct data works", async () => {
    const store = new MockStore({
      schema: builtSchema,
      mocks: mocks,
    });
    const mockSchema = addMocksToSchema({
      schema: builtSchema,
      preserveResolvers: true,
      store,
    });
    const mockValidator = new Validator(mockSchema);
    const result = mockValidator.sample("EntityFlagEvent");
    store.reset();
    const result2 = mockValidator.sample("EntityFlagEvent");
    expect(result.data?.["EntityFlagEvent"].id).not.toEqual(
      result2.data?.["EntityFlagEvent"].id,
    );
  });
});
