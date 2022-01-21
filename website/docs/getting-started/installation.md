---
sidebar_position: 3
---

# Installation and Setup

To start using this library, you need to decide the message broker you are using. The core library, `graphql-eventbus`, provides a framework to create an event bus powered by GraphQL. We have two libraries that provides an implementation of the event bus using `RabbitMQ` (`npm i graphql-eventbus-rabbitmq`) and `Google Pubsub` (`npm i graphql-eventbus-pubsub`) as the message broker. It's very easy to create an implementation using your favorite message broker as covered in the Create Your Bus section in the tour. To follow the example in `examples/rabbit-mq` folder, we use the `graphql-eventbus-rabbitmq` library.

```bash
npm i graphql-eventbus-rabbitmq
```

**Peer Dependency**

```bash
npm i graphql
```

To create GraphQL document nodes, use the `graphql-tag` library

```bash
npm i graphql-tag
```

For code generation, install the following packages:

```bash
npm i -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations graphql-eventbus-codegen
```

See the next section to follow a sample example.
