/* eslint-disable no-console */
import { Validator } from "graphql-eventbus-google-pubsub";
import { addResolversToSchema } from "@graphql-tools/schema";
import { consumerSchema } from "#root/src/eventbus";
import { EventSampler } from "#root/src/generated/codegen-event-consumer";
import { DateTimeResolver, mocks } from "graphql-scalars";
import { addMocksToSchema, MockStore } from "@graphql-tools/mock";

const schemaWithResolvers = addResolversToSchema(consumerSchema, {
  DateTime: DateTimeResolver,
});

const store = new MockStore({
  schema: schemaWithResolvers,
  mocks: mocks,
});

export const eventSchemaWithMocks = addMocksToSchema({
  schema: schemaWithResolvers,
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
