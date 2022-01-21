---
sidebar_position: 2
---

# Consuming Events

Regardless of the message broker, all the implementation of `GraphQLEventbus` uses three parameters to start consuming events:

### Schema

To start consuming events, the consumer will need to know all the events being published with the corresponding payloads. We represent all these events in a GraphQL schema. We require all the events being published to be specified under the root query field. The name of each field corresponds to the name of the topic and their type correspond to the payload. For instance, service A is publishing the following schema

```graphql title="examples/rabbit-mq/src/serviceA/schema-event.graphql"
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

According to this schema, this service is publishing `UserCreatedEvent` and `UserDeletedEvent` with the corresponding payload represented by their object types. This library requires the payload of each topic to be an object type.

A consumer can consume events published by any service. In a service architecture, you would need to merge all the event schemas so that any service can comsume any of these events. In this example, we are using GraphQL Codegen to merge schemas from all the services and print it using the `graphql-eventbus-codegen` plugin ([API](/docs/api/codegen)). See the `schema` array in `codegen.yaml` file. The final generated schema, `publisher.graphql`, can be used by any of the consumers to consume events.

### Documents

Every event consumed by a service must be specified by a GraphQL document that queries the corresponding root event field with the corresponding payload. This is essentially same as querying a root query field from a GraphQL schema. We must also specify the fields to query from each event.

For instance, service B is consuming `UserCreatedEvent` and `EmailOpenEvent` with the fields as shown in the documents below. In this example, `UserCreatedEvent` event is being published by service A and `EmailOpenEvent` is being published by service C. Note that Service B is not interested in consuming any field of EmailOpenEvent payload. However, we must specify at least one field to consume an event. In this case, we use `__typename` field which is the default field added to each object by GraphQL executor.

```graphql title="examples/rabbit-mq/src/serviceB/event-consumer.graphql"
query UserCreatedEvent {
  UserCreatedEvent {
    userEmail
    userType
    userName
  }
}

query EmailOpenEvent {
  EmailOpenEvent {
    __typename
  }
}
```

Note that we are allowed to query a single field inside each `query`. Under the hood, these queries are used to create subscription in the message broker for the corresponding topics.

### Event Handlers

Every event that a consumer subscribes to must be handled in the callback function. The signature of the function is `EventBusSubscriberCb`. This function is called for each event with the payload being queried. Note that we also expose the full payload under the `_fullData` key but the type safety is not guaranteed for this.

```typescript
export declare type EventBusSubscriberCb = (props: {
  topic: string;
  payload: {};
  _fullData: {};
  metadata: GraphQLEventbusMetadata;
}) => Promise<unknown>;
```

One of the advantages of this library is the code generated for each event handler. We export a `EventHandlers` object which helps us write type safe event handler functions.

```typescript title="examples/rabbit-mq/src/serviceB/generated/codegen-event-consumer.ts"
export interface EventHandlers {
  UserCreatedEvent: (
    msg: UserCreatedEventQuery["UserCreatedEvent"],
    ctx: MessageHandlerContext,
  ) => Promise<unknown>;
  EmailOpenEvent: (
    msg: EmailOpenEventQuery["EmailOpenEvent"],
    ctx: MessageHandlerContext,
  ) => Promise<unknown>;
}
```

This is how we use the object:

```typescript title="examples/rabbit-mq/src/serviceB/eventHandlers.ts"
import { v4 } from "uuid";
import { EventHandlers } from "./generated/codegen-event-consumer";

export const eventHandlers: EventHandlers = {
  UserCreatedEvent: async (msg, ctx) => {
    if (!msg.userEmail) {
      return;
    }
    await ctx.publish({
      topic: "SendEmailEvent",
      payload: {
        content: `Welcome ${msg.userName}`,
        emailAddress: msg.userEmail,
        eventId: v4(),
      },
    });
  },
  EmailOpenEvent: async (msg) => {
    console.log(`Yay an email has been opened!`);
  },
};
```

Try changing the queried field in the `event-consumer.graphql` field and see the updated `msg` object. (You need to run `codegen:watch` in the background for code generation to watch the files). Notice the each event handler has two arguments. First, an object with the fields being queried. Second, a custom context object that is created whenever an event is received. The `context` could have a database model object, a logging function or anything else that the event handlers need.
