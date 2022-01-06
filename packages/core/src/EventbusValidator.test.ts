import { EventBusValidator } from "./EventBusValidator";
import fs from "fs";
import { buildSchema } from "graphql";
import path from "path";
import gql from "graphql-tag";
import { EventEmitter } from "events";
import { addMocksToSchema } from "@graphql-tools/mock";
import { mocks } from "graphql-scalars";
import { Validator } from "./validator";

const typeDef = fs.readFileSync(
  path.join(__dirname, "../data/events.graphql"),
  "utf-8"
);

const publisherSchema = buildSchema(typeDef);

const mockSchema = addMocksToSchema({
  schema: publisherSchema,
  mocks: mocks,
});

const validator = new Validator(mockSchema);

describe("EventBusValidator", () => {
  test("consumer works as expected for accepted and rejected consumer message", async () => {
    const publishCb = jest.fn();
    const consumeCb = jest.fn().mockResolvedValue(null);
    const subscribeCb = jest.fn();
    const getTopicCb = jest.fn();
    const signupEventEmitter = new EventEmitter();
    const entityFlagEmitter = new EventEmitter();
    const queries = gql`
      query SignUpEvent {
        SignUpEvent {
          id
        }
      }
      query EntityFlagEvent {
        EntityFlagEvent {
          id
          groupId
        }
      }
    `;
    const consumerEventBus = new EventBusValidator({
      publisherSchema,
    });
    await consumerEventBus.validateConsumerQueries(queries);
    expect(
      await consumerEventBus.extractData({
        topic: "SignUpEvent",
        data: validator.sample("SignUpEvent").data["SignUpEvent"],
      })
    ).toMatchObject({
      id: expect.any(String),
    });
  });
  test("publisher works as expected", async () => {
    const eventBusValidator = new EventBusValidator({
      publisherSchema,
    });
    await expect(
      eventBusValidator.publishValidate({
        topic: "SignUpEvent",
        payload: validator.sample("SignUpEvent").data["SignUpEvent"],
      })
    ).resolves;
    const errCb = jest.fn();
    await eventBusValidator
      .publishValidate({
        topic: "UnknownEvent",
        payload: validator.sample("SignUpEvent").data["SignUpEvent"],
      })
      .catch(() => {
        errCb();
      });
    expect(errCb).toBeCalled();
    errCb.mockClear();
    // wrong payload
    await expect(
      eventBusValidator
        .publishValidate({
          topic: "SignUpEvent",
          payload: { id: 5 },
        })
        .catch(() => {
          errCb();
        })
    );
    expect(errCb).toBeCalled();
  });
});
