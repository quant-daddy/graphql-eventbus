---
sidebar_position: 2
---

# Prerequisites

While GraphQL is a language agnostic framework, this library currenly runs on NodeJS only.

Before getting started with GraphQLEventbus, bear in mind that we assume that the following infrastructure has already been set up, as well as some level of familiarity with the topics below.

## Typescript/Javascript

GraphQLEventbus is a framework built in JavaScript, so we assume familiarity with the JavaScript language.

## GraphQL

We also assume basic understanding of GraphQL. In order to start using GraphQLEventbus, you will need to understand how to write a GraphQL SDL and Documents. If you have used a GraphQL client and server, you will have no difficulty getting started with this library.

## Event Architecture

We assume that you understand the notion of publishing events, consuming events, and message broker (any one of RabbitMQ, Google Pubsub, Kafka, NATS etc). You have some level of familiarity with publishing to topics in a message broker and subscribing to topics to consume events.
