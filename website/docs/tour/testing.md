---
sidebar_position: 99
---

# Testing

Testing is the cornerstone of a reliable production quality applicaton. The library provides all the tools you might need to easily test your event publishing and event handlers. We will use `MemoryEventBus` to test the runtime behavior of our code.

## Publishing Events

Create a sample `MemoryEventBus` with the schema of events that you publish. You can also import the `Publish` function from the generated code. See below.

```typescript
import { MemoryEventBus } from "graphql-eventbus";
import schema from "./bus";
import { Publish } from "./generated/codegen-event-publisher";

const createSamplePublisher = async () => {
  const bus = new MemoryEventBus({
    schema,
  });
  await bus.init();
  const publish: Publish = async (args) => {
    await bus.publish(args);
  };
  return publish;
};
```

This function can be imported in your test file to publish events and detect errors during testing.

## Consuming Events

Testing event handlers require a tedious task of generating mock data. Don't worry though: with the power of GraphQL schema, generating mock data is as simple as a function call. All we need to do is add mocks to our consumer schema to create a mocked schema. [See an example](https://github.com/quant-daddy/graphql-eventbus/blob/master/examples/rabbit-mq/src/serviceB/utils/sampleEventData.ts). You can add your custom mock functions but we are using the default mocks from `graphql-scalars` library.

With the help of mocked schema, you can easily generate mock data for each event using `Validator` class exported from the library. It exposes a `sample` method which takes the event name and an optional override object to override fields in the final payload.

```typescript
import { mocks } from "graphql-scalars";
import { addMocksToSchema, MockStore } from "@graphql-tools/mock";

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
```

To make our sampler function easy to use in typescript, we also generate code for `EventSampler` using `eventSampler: true` option in `graphql-eventbus-config` plugin.

```typescript
function eventSampler(args: {
  event: "EmailOpenEvent";
  override?: Partial<EmailOpenEvent>;
}): EmailOpenEvent;
function eventSampler(args: {
  event: "UserDeletedEvent";
  override?: Partial<UserDeletedEvent>;
}): UserDeletedEvent;
function eventSampler(args: {
  event: "SendEmailEvent";
  override?: Partial<SendEmailEvent>;
}): SendEmailEvent;
function eventSampler(args: {
  event: "UserCreatedEvent";
  override?: Partial<UserCreatedEvent>;
}): UserCreatedEvent;
function eventSampler(): {} {
  return {};
}
export type EventSampler = typeof eventSampler;
```

This makes the function `sampleEventData` fun to use.

FInally, to test our event handlers, we create a `MemoryEventBus` which enables consuming the same events that are published. [See an example](https://github.com/quant-daddy/graphql-eventbus/blob/master/examples/rabbit-mq/src/serviceB/utils/sampleEventData.ts).
