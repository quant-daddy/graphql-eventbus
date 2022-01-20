# Example of `graphql-eventbus-rabbitmq`

We have three services: A, B, and C that are publishing and consuming events. Service A publishes `UserCreatedEvent` and `UserDeletedEvent`, Service B consumes `UserCreatedEvent` and publishes `SendEmailEvent`, and Service C consumes `SendEmailEvent` and publishes `EmailOpenEvent` event. Finally, `EmailOpenEvent` event is consumed by Service A. We are using RabbitMQ messsage broker implementation of GraphQL Eventbus. This is a sample implementation and might need to be modified for the production use case.

## How to run:

First, make sure that RabbitMQ is accessible at local host. You can use the `docker-compose` file at the root of the project to start `RabbitMQ`

```bash
docker-compose up -d rabbit
```

```bash
cd examples/rabbitmq
npm install
npm run start
```

For code generation,

```bash
npm run codegen:watch
```

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
query SendEmailEvent {
  SendEmailEvent {
    content
    emailAddress
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

For consuming:

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

```graphql title="examples/rabbit-mq/src/serviceB/event-consumer.graphql"
query SendEmailEvent {
  SendEmailEvent {
    content
    emailAddress
  }
}
```
