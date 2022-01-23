---
sidebar_position: 2
---

# MemoryEventBus

`MemoryEventBus` is a class that implements an event bus using `EventEmitter` as the in-memory message broker. Since the message broker has no access to anything outside the `EventEmitter`, the bus can only consume events that are published by it. This bus can be used for consuming webhooks. See [this example](https://github.com/quant-daddy/graphql-eventbus/tree/master/examples/webhook).

## constructor

The constructor takes `MemoryEventBusConfig` as the only argument:

```typescript
type EventBusSubscriberCb = (props: {
  topic: string;
  payload: {};
  _fullData: {};
  metadata: GraphQLEventbusMetadata;
}) => Promise<unknown>;

export type MemoryEventBusConfig = {
  schema: GraphQLSchema;
  subscriber?: {
    cb: EventBusSubscriberCb;
    queries: DocumentNode;
  };
  plugins?: EventBusPlugin[];
  allowInvalidTopic?: boolean;
};
```

### schema

This is the `GraphQLSchema` that is used by the `publish` to publish the events and the `subscriber` to consume the events. The reason `MemoryEventBus` uses the same schema for publishing and consuming is because it can only consume events that it publishes. This is different from a bus that uses a message broker that lives outside the process memory: RabbitMQ for instance.

### subscriber

This field must be specified when consuming events.

#### cb

_Required field_. This is the event handler callback that is invoked for each event being consumed as specfied by the `queries` field. `topic` is the name of the topic, `payload` is the object that has fields queried by the consumer in `queries` field.

#### queries

_Required field_. The GraphQL `DocumentNode` that specifies all the events being published as GraphQL queries. For instance, the document below subscribes for `UserCreatedEvent` and `UserDeletedEvent` and queries for specific fields from the payload.

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

### plugins

This is an optional list of [EventBusPlugin](/docs/api/plugin).

### allowPublishNonExistingTopic

This is a `boolean` field (default `false`). If `true`, the bus does not throw an error when publishing a topic that does not exist in the `schema`. This option could be useful when we don't control the events that we publish and want to avoid error being thrown in production. An event that's not in the schema will be simply ignored.
