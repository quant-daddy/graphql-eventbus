---
sidebar_position: 1
id: intro
---

# Introduction

GraphQL eventbus is an abstraction layer on top of GraphQL SDL to publish and consume messages in a type-safe way. It is message broker agnotic: you can pick Kafka, RabbitMQ, or even in-memory EventEmitter as your message broker. With features like code generation, runtime type safety, easy to use API, plugin system for logging and monitoring, and more, you can build a production quality event hub for your service architecture.

Let's discover **GraphQL Eventbus in less than 10 minutes**.

## Overview

Let's model is scenario where we have three services: A, B, and C that are publishing and consuming events. Service A publishes `UserCreatedEvent` and `UserDeletedEvent`, Service B consumes `UserCreatedEvent` and publishes `SendEmailEvent`, and Service C consumes `SendEmailEvent` and publishes `EmailOpenEvent` event. Finally, `EmailOpenEvent` event is consumed by both Service A and Service B.

<p align="center"><img src="/img/service-diagram.png" width="800"/></p>

We want to express publishing of these events with their corresponding payloads through GraphQL SDL and consumption of these events through GraphQL documents. To do this, we follow some rules. Every event published by a service must be specified in a GraphQL SDL as a root query field with the payload as an object. Every event consumed by a service must be specified by a individual GraphQL document that queries the root event field with the corresponding payload.

Below are the SDLs and documents for each of the services.

### Service A

For publishing events:

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

For consuming events:

```graphql title="examples/rabbit-mq/src/serviceA/event-consumer.graphql"
query EmailOpenEvent {
  EmailOpenEvent {
    emailAddress
    openedAt
  }
}
```

### Service B

For publishing events:

```graphql title="examples/rabbit-mq/src/serviceB/schema-event.graphql"
scalar EmailAddress
scalar UUID
scalar DateTime

type Query {
  SendEmailEvent: SendEmailEvent!
}

type SendEmailEvent {
  eventId: UUID!
  content: String!
  emailAddress: EmailAddress!
}
```

For consuming `UserCreatedEvent` and `EmailOpenEvent` events, we use the queries below. Note that Service B is not interested in consuming any field of `EmailOpenEvent` payload. However, we must specify at least one field to consume an event. In this case, we use `__typename` field which is the default field added to each object by GraphQL executor.

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

### Service C

For publishing events:

```graphql title="examples/rabbit-mq/src/serviceC/schema-event.graphql"
scalar EmailAddress
scalar UUID
scalar DateTime

type Query {
  EmailOpenEvent: EmailOpenEvent!
}

type EmailOpenEvent {
  eventId: UUID!
  openedAt: DateTime!
  emailAddress: EmailAddress!
}
```

For consuming events:

```graphql title="examples/rabbit-mq/src/serviceC/event-consumer.graphql"
query SendEmailEvent {
  SendEmailEvent {
    content
    emailAddress
  }
}
```

## Core Concepts

So far, we have described how a service can publish and consume events. The transport layer for this data is typically an event bus like `RabbitMQ`, `Google PubSub` or even an `EventEmitter` in NodeJS. It's the responsiblity of the transport layer to create necessary topics and publish JSON payload that can be subscribed to by multiple event consumers. The purpose of the core library `graphql-eventbus` is to provide an abstraction layer on top of GraphQL SDL and documents to create topics, validate payload when an event is published, and trigger callback for events that a service is consuming through the specified documents. The library exposes a `GraphQLEventbus` class that can be used to build a GraphQL powered event bus on top of any message broker. This class does all the heavy lifting:

#### As a publisher:

It requires the SDL that has all the events being published by the service.

- Parse the SDL and extract the events and corresponding payloads.
- Validate the payload at runtime to make sure that the fields are valid and required fields are not missing.
- Trigger the `publish` method with the topic and the validated payload. This method must in turn publish the payload in the message broker.

#### As a consumer:

It requires the SDL which has all the events that can be consumed and list of all the documents that corresponds to events being consumed by the service.

- Parse the documents and find the list of events being consumed and validate that the field being queried are actually part of the payload.
- Validate the payload when an event is received.
- Extract the fields from the payload and trigger the event handler with the fields that it queried for.

It is the responsiblity of the implementing class to use a message broker, create topics and subscriptions, cestablish connection and other message broker specific logic. We have created such implementations for **RabbitMQ** (`graphql-eventbus-rabbitmq` library), **Google PubSub** (`graphql-eventbus-pubsub` library), and in-memory **EventEmitter** exposed as `MemoryEventBus` by the `graphql-eventbus` library. These implementations may not cover every use case and are meant to be for illustration purpose. In later section, we go into the details of how you can create a bus using any message broker. The goal is for you to be able to create your custom bus that you can use as a shared library with your services.

## Managing Schema

In a service architecture, a service can consume event being published by any other service. To enable this, we need a process that could merge the event schema from all the publishing services into one event schema that can be consumed by each consumer. This can be done using the `graphql-codegen` plugin. It allows us to introspect schema from Github repositories, merge them, and create a single schema. Our codegen plugin, `graphql-eventbus-codegen`, can be used to print the merged schema that can be consumed by the consumer event bus.
