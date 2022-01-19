import { LoggingPlugin } from "./LoggingPlugin";
import wait from "waait";
import gql from "graphql-tag";
import fs from "fs";
import path from "path";
import { buildSchema } from "graphql";
import { MemoryEventBus } from "./MemoryEventBus";
import { SubscriberConfig } from "./EventBus";
import { addMocksToSchema } from "@graphql-tools/mock";
import { mocks } from "graphql-scalars";
import { Validator } from ".";
import { v4 } from "uuid";

const typeDef = fs.readFileSync(
  path.join(__dirname, "../data/events.graphql"),
  "utf-8",
);

const publisherSchema = buildSchema(typeDef);

const mockSchema = addMocksToSchema({
  schema: publisherSchema,
  mocks: mocks,
});

const validator = new Validator(mockSchema);

describe("MemoryEventBus", () => {
  test("works", async () => {
    const consumeCb = jest.fn();
    const queries = gql`
      query Query1 {
        SignUpEvent {
          id
        }
      }
      query Query2 {
        EntityFlagEvent {
          id
          groupId
        }
      }
    `;
    const subscribeConfig: SubscriberConfig = {
      cb: consumeCb,
      queries,
      schema: publisherSchema,
    };
    const bus = new MemoryEventBus({
      schema: publisherSchema,
      subscriber: subscribeConfig,
      plugins: [LoggingPlugin()],
    });
    await bus.init();
    await bus.publish({
      topic: "SignUpEvent",
      payload: validator.sample("SignUpEvent").data["SignUpEvent"],
      metadata: { test: "data" },
    });
    await wait(0);
    expect(consumeCb).toBeCalledTimes(1);
    expect(consumeCb.mock.calls[0][0]).toMatchObject({
      payload: {
        id: expect.any(String),
      },
      topic: "SignUpEvent",
      // metadata is propagated
      metadata: { test: "data" },
    });
    // not existing topic cannot be published
    expect(
      bus.publish({
        topic: "A",
        payload: {
          id: v4(),
          timestamp: new Date().toISOString(),
        },
      }),
    ).rejects.toThrow();
    await bus.publish({
      topic: "EntityFlagEvent",
      payload: validator.sample("EntityFlagEvent").data["EntityFlagEvent"],
      metadata: { "x-request-id": "123" },
    });
    await wait(0);
    expect(consumeCb.mock.calls[1][0]).toMatchObject({
      payload: {
        id: expect.any(String),
        groupId: expect.any(String),
      },
      topic: "EntityFlagEvent",
      metadata: { "x-request-id": "123" },
    });
    consumeCb.mockClear();
    // not subscribed events are not consumed
    await bus.publish({
      topic: "Complex",
      payload: validator.sample("Complex").data["Complex"],
    });
    await wait(0);
    expect(consumeCb).not.toBeCalled();
  });
});
