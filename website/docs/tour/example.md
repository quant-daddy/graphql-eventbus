---
sidebar_position: 1
---

# Example

`GraphQLEventbus` is a javascript class for building your own bus. It is exported by `graphql-eventbus` package. It provides an abstraction layer on top of GraphQL SDL to publish events and GraphQL documents to consume them. You get to pick your message broker, be it Kafka, PubSub, NATS or anything else. The only requirement on the bus is that it should be able to publish and consume topic based events. `GraphQLEventbus` does all the heavy lifting for you: parsing your schemas and documents to extract topics and payloads, validating the payloads, propagating metatada, providing plugins and more.

The goal of this library is to enable you to create a custom event bus for your message broker powered by GraphQL. We provide sample implementations using Google Pubsub, RabbitMQ, and `EventEmitter` in NodeJS that you can customize or use out of the box. For the purpose of this tour, we will use the bus with RabbitMQ as the message broker. To follow along, please download the repository and go to the `examples/rabbit-mq` folder.

```bash
cd examples/rabbit-mq
npm i
```

This sample project has services that communicate through events. We have three services: A, B, and C that are publishing and consuming events. Service A publishes UserCreatedEvent and UserDeletedEvent, Service B consumes UserCreatedEvent and publishes SendEmailEvent, and Service C consumes SendEmailEvent and publishes EmailOpenEvent event. Finally, `EmailOpenEvent` event is consumed by Service A and Service B.

<p align="center"><img src="/img/service-diagram.png" width="800"/></p>

Service A publishes `UserCreatedEvent` event 5 sections. To see it in action, run `npm run start`. Make sure that you have `RabbitMQ` server accessible at localhost. To make it easy for you, we provide a docker compose file at the root of this project repository.

```bash
docker-compose up -d rabbit
```

Next, let's talk about how this library works.
