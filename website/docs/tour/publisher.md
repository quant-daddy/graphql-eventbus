---
sidebar_position: 3
---

# Publishing Events

For a service to publish events, it needs to create a GraphQL schema that has the list of events and their corresponding payload. The schema is a counterpart of the schema that is consumed by a consumer. See [consumer schema](/docs/tour/consumer#schema) for details. At runtime, the bus only publishes events that are specified in the schema. It also validate the published payload at runtime to make sure that the fields are valid and required fields are not missing.

`graphql-eventbus-codegen` plugin creates the signature of a function to publish events in a type-safe way. For instance, service A uses the following schema to publish events

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

This schema generates the `Publish` signature function to publish events.

```typescript title="examples/rabbit-mq/src/serviceA/generated/codegen-event-publisher.ts"
function publish(
  data:
    | { topic: "UserCreatedEvent"; payload: UserCreatedEvent }
    | { topic: "UserDeletedEvent"; payload: UserDeletedEvent },
): Promise<void>;
function publish(): Promise<void> {
  return Promise.resolve();
}

export type Publish = typeof publish;
```

In this example, service A publishes the `UserCreatedEvent` periodically. See [examples/rabbit-mq/src/index.ts](https://github.com/quant-daddy/graphql-eventbus/blob/master/examples/rabbit-mq/src/index.ts) file for details.
