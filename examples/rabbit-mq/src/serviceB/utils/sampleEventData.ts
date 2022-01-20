/* eslint-disable no-console */
import { Validator } from "graphql-eventbus";
import { mocks } from "graphql-scalars";
import { addMocksToSchema, MockStore } from "@graphql-tools/mock";
import { consumerSchema } from "../bus";
import { EventSampler } from "../generated/codegen-event-consumer";

const store = new MockStore({
  schema: consumerSchema,
  mocks: mocks,
});

export const eventSchemaWithMocks = addMocksToSchema({
  schema: consumerSchema,
  preserveResolvers: true,
  store,
});

const validator = new Validator(eventSchemaWithMocks);

export const sampleEventData: EventSampler = (args: any) => {
  store.reset();
  const data = validator.sample(args.event);
  if (data.errors || !data.data) {
    console.log(data.errors);
    throw new Error("Encountered error when generating data");
  }
  // eslint-disable-next-line @typescript-eslint/ban-types
  return { ...data.data[args.event], ...args.override };
};
