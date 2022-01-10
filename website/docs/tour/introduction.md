---
sidebar_position: 1
---

# Introduction

`GraphQLEventbus` is a javascript class for building your own bus. It provides an abstraction layer on top of GraphQL SDL to publish events and GraphQL documents to consume them. You get to pick your message broker, be it Kafka, PubSub, NATS or anything else. The only requirement on the bus is that it should be able to publish and consume topic based events. This class does all the heavy lifting for you: parsing your schemas and documents to extract topics and payloads, validating the payloads, propagating metatada, providing plugins and more.

The goal of this library is to enable you to create a custom event bus for your message broker. We provide sample implementations using Google Pubsub, RabbitMQ, and `EventEmitter` in NodeJS that you can customize or use out of the box.
