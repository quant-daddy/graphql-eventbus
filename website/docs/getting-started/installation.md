---
sidebar_position: 3
---

# Installation and Setup

To start using this library, you need to decide the message broker you are using. The core library, `graphql-eventbus`, provides a framework to create an event bus powered by GraphQL. We have two libraries that provides an implementation of the event bus using `RabbitMQ` and `Google Pubsub` as the message broker. It's very easy to create an implementation using your favorite message broker as covered in the [Create Your Bus](/docs/tour/create-your-bus/) section in the tour. To follow the example in `examples/rabbit-mq` uses RabbitMQ event bus.

**RabbitMQ**

```bash
npm i graphql-eventbus-rabbitmq
```

**Google Pubsub**

```bash
# use this for using google pubsub as the message broker
npm i graphql-eventbus-pubsub
```

**Peer Dependency**

```bash
npm i graphql@"<16.0.0"
```

To create GraphQL documents, use the `graphql-tag` library

```bash
npm i graphql-tag
```

For code generation, install the following packages:

```bash
npm i -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations graphql-eventbus-codegen
```

See the next section to follow a sample example.
