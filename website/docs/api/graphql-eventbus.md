---
sidebar_position: 1
---

# GraphQLEventbus

A class exported by `graphql-eventbus` that can be used to create your custom event bus with any message broker.

## `constructor`

`GraphQLEventbus` is a javascript class. The arguments to the constructor function are explained below.

### `publisher`

If the event bus wants to publish events, this argument should be used.

#### `schema`

The [GraphQLSchema](https://graphql.org/graphql-js/type/#graphqlschema) that has all the events that this bus wants to publish. Each event is specified as a field of the root `Query` field. For instance, in the sample schema SDL below, we are publishing two events: `UserCreatedEvent` and `UserDeletedEvent`. Note that this must be an executable schema with resolvers for each [custom scalar](https://graphql.org/learn/schema/#scalar-types). Note that this schema is a subset of a GraphQL schema SDL. In particular, all the field specified as the root query field is an `event` and it must have return type as a non nullable object, specified by `!` in the SDL.

```graphql
scalar EmailAddress
scalar UUID
scalar DateTime

type Query {
  UserCreatedEvent: UserCreatedEvent!
  UserDeletedEvent: UserDeletedEvent!
}

type UserDeletedEvent {
  eventId: UUID!
  userId: ID!
}

type UserCreatedEvent {
  createdAt: DateTime!
  eventId: UUID!
  userEmail: EmailAddress
  userId: ID!
  userName: String
  userType: UserType!
}

enum UserType {
  ENTERPRISE
  STARTUP
}
```

#### `publish`

This is the function you can use to publish the events in your message broker. It is up to you to decide how you want to encode the payload to publish to you message broker. For instance, you can just stringify the baggage and publish the buffer to your message broker. You must make sure that you can identify the event when consuming it from your broker. In the case of [MemoryEventBus](https://github.com/quant-daddy/graphql-eventbus/blob/b421905d07bd797a166a9bc10ac1581f9ed92686/packages/core/src/MemoryEventBus.ts#L30) which used `EventEmitter` under the hood, we use `message-${args.topic}` as the name of the topic.

```typescript
export interface Baggage {
  payload: {};
  metadata: GraphQLEventbusMetadata;
}
publish: (args: {
  topic: string;
  baggage: Baggage;
}) => Promise<unknown>;
```

<div id="publish_example"></div>

```typescript
# Using EventEmitter as the message broker
publish: async (args) => {
  this.eventEmitter.emit(
    `message-${args.topic}`,
    JSON.stringify(args.baggage)
  );
},
```

#### `publishInit`

Message broker typically require some initialization when publishing events. For instance, this could be creating some `topic` or `channel` object in your broker to publish events. This method is called when calling `init` method in `GraphQLEventBus` instance.

```typescript
publishInit?: (topics: string[]) => Promise<unknown>;
```

In the case of [PubSubEventBus](https://github.com/quant-daddy/graphql-eventbus/blob/b421905d07bd797a166a9bc10ac1581f9ed92686/packages/google-pubsub/src/PubSubEventBus.ts), we use the follow initilization logic:

```typescript
publishInit: async (topics) => {
  for (const topicname of topics) {
    // eslint-disable-next-line no-await-in-loop
    const [topic] = await this.pubsubClient
      .topic(topicname)
      .get({ autoCreate: true });
    this.publishTopics[topicname] = topic;
  }
},
```

#### `allowInvalidTopic`

Default false. If true, the bus does not throw an error when the topic being published at runtime is not specified in the schema. This is useful when you may publish an unknown topic in production and you want to simply ignore that topic and skip throwing an error. This could be useful when you are consuming webhooks. <br/>

```typescript
allowInvalidTopic?: boolean;
```

### `subscriber`

If the event bus wants to consume events, this argument must be specified.

#### `schema`

_Required field_.
The [GraphQLSchema](https://graphql.org/graphql-js/type/#graphqlschema) that has all the events that this bus could consume events from. Any event not defined inside this schema cannot be consumed by this bus. Typically, this schema represents a SDL stitched from all the publishers schemas in your event architecture. This schema is typically different from `publisher.schema`: a bus typically won't consume the events that it publishes. Except, in the case of [MemoryEventBus](https://github.com/quant-daddy/graphql-eventbus/blob/b421905d07bd797a166a9bc10ac1581f9ed92686/packages/core/src/MemoryEventBus.ts), you can only consume the events that are being published by the bus.

#### `queries`

_Required field_.
`DocumentNode` that contains all the events and corresponding payload that this bus wants to consume. For instance, if the subscriber [schema](#schema-1) was as specified in this [example above](#schema), a sample value for this field could be

```graphql
query UserCreatedEvent {
  UserCreatedEvent {
    userId
    userName
    userType
    eventId
  }
}
query UserDeletedEvent {
  UserDeletedEvent {
    userId
  }
}
```

In this case, we are subscribing to both `UserCreatedEvent` and `UserDeletedEvent` event and are specifically consuming the fields as specified in these queries. Of course we can only subscribe to the events in the schema. A sample document like below would throw an error at runtime because this event is not specified in the [schema](#schema-1)

```graphql
query NonExistingEvent {
  NonExistingEvent {
    field1
  }
}
```

#### cb

_Required field_. This function is the event handler that would be invoked by the event bus when an event arrives. The argument is an object with the following fields:

- `topic`: the topic of the event
- `payload`: the payload that the event consumer has queried for, as specified in the [queries](#queries) document.
- `_fullData`: the full payload for this event, including fields that were not queried for. It is advisable to not use this field in the event handlers because the code generation plugin does not do any code generation for this property. We exposed this field for cases when the client might want to store or inspect the full payload received for the event.
- `metadata`: Every time an event is publish, the bus adds some metadata to the baggage. This data is used for things like correlating multiple events as a part of a request, tracking publishing time of event. This is used in the [Metrics Plugin](/docs/plugins/metrics-plugins) to emit various metrics of interest. It is advisable to propagate this metadata through your event architecture.

```typescript
interface GraphQLEventbusMetadata {
  "x-request-id": string;
  publishTime: string;
  messageId: string;
  [key: string]: string;
}
type EventBusSubscriberCb = (props: {
  topic: string;
  payload: {};
  _fullData: {};
  metadata: GraphQLEventbusMetadata;
}) => Promise<unknown>;

cb: EventBusSubscriberCb;
```

This function is typically provided by the user of the event bus is passed through to the `GraphQLEventbus`. See the constructor argument of [MemoryEventBus](/docs/api/memory-eventbus)

#### subscribe

_Required field_.
This function is responsible for triggering the data callback (`DataCb`) when an event arrives. The first argument, `topics: string[]` are the list of topics that the consumer has susbcribed to and the second argument `cb` is a callback function that should be invoked when an event arrives. The `cb` function is called with the `topic` and corresponding `Baggage`. Note that this is the `Baggage` that was published as shown [here](#publish_example).

```typescript
interface Baggage {
  payload: {};
  metadata: GraphQLEventbusMetadata;
}
type DataCb = (args: {
  baggage: Baggage;
  topic: string;
}) => Promise<unknown>;

subscribe: (
  topics: string[],
  cb: DataCb
) => OptionalPromise<unknown>;
```

As an example, for [MemoryEventBus](https://github.com/quant-daddy/graphql-eventbus/blob/b421905d07bd797a166a9bc10ac1581f9ed92686/packages/core/src/MemoryEventBus.ts#L42), we invoke `cb` when an event is emitted:

```typescript
{
  cb: this.config.subscriber!.cb,
  subscribe: (topics, cb: DataCb) => {
    topics.forEach((topic) => {
      this.eventEmitter.on(
        `message-${topic}`,
        async (baggageString) => {
          await cb({
            baggage: JSON.parse(baggageString) as Baggage,
            topic,
          });
        }
      );
    });
  },
  queries: this.config.subscriber.queries,
  schema: this.config.schema,
}
```

### `plugins`

We can provide plugins that provide us life cycle hooks to various parts of event publishing and consumption process. Please refer to the documention in the [plugin](/docs/api/plugin) section.

## `init`

This method is used to initialize the event bus and catch various error before the bus starts. For instance, it checks if all the events being consumed are presentin the schema. It also calls the [publishInit](#publishinit) and [subscribe](#subscribe) functions.This method must be called in the implemention of your bus. See [MemoryEventBus](https://github.com/quant-daddy/graphql-eventbus/blob/b421905d07bd797a166a9bc10ac1581f9ed92686/packages/core/src/MemoryEventBus.ts)

## `publish`

This method should be invoked by the implementation of the event bus to publish events. A publish method is typically exposed by the event bus implementation which in turns calls this method. `topic` is the name of the topic as defined in the schema, `payload` is the full payload for the event, and `metadata` is an optional object. This is propagated as part of the `Baggage`. All fields except See [MemoryEventBus publish method](https://github.com/quant-daddy/graphql-eventbus/blob/b421905d07bd797a166a9bc10ac1581f9ed92686/packages/core/src/MemoryEventBus.ts#L66) for instance.

```typescript
publish = async (props: {
  topic: string;
  payload: {};
  metadata?: Partial<GraphQLEventbusMetadata>;
}) => {};
```

The final `metadata` that is propagated when publishing an event is:

```
const metadata: GraphQLEventbusMetadata = {
  "x-request-id": uuid(),
  ...props.metadata,
  messageId: uuid(),
  publishTime: new Date().toISOString(),
};
```
