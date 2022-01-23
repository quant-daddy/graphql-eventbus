---
sidebar_position: 999
---

# FAQ

## Difference with Protobuf

Protobuf can be a good choice if you want to reduce the size of your event payloads. However, there are no tools to visualize all your event schemas. GraphiQL allows you to easily explore/visualize all your events. In addition, Protobuf does not have a concept of querying fields from the payload: every consumer consumes fields that they might not even need. GraphQL Eventbus lets you consume specific fields from each event's payload which makes schema evolution and field deprecation or removal easier without breaking any clients.

## Difference with JSON Schema

JSON schema can be verbose to write. Also, it is not easily extendable. GraphQL provides primitives to define your own data type using custom scalars.

## Is this library production ready?

The library has running in production at https://gully.to for last nine months. We are using this library for event based communication across seven microservices and for consuming external webhooks. Since the company is a small startup, we have not handled high volume. Take this as more of a proof of concept. We would love to help any organization who is interested in using this library. Send us a private message on Twitter!

## How do I contribute?

Please open PRs and issues on Github. To support us, please consider [leaving us a star](https://github.com/quant-daddy/graphql-eventbus) and spreading the word.
