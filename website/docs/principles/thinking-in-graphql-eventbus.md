---
sidebar_position: 1
---

# Thinking in GraphQL Eventbus

## Schema Evolution & Type Safety

One of the fundamental differences between `GraphQL` and REST APIs is that in `GraphQL`, the API consumer gets to define the fields it wants as opposed of the REST APIs where the server pushes all the data available at a route. It is difficult to deprecate or remove fields in REST APIs without breaking the contract because the server does not know what fields are being consumed by the clients. On the other hand, a GraphQL server knows every field being consumed by the clients. The server can keep a history of recently consumed fields from the schema and get an idea of what field are not being used and can be safely removed. Also, GraphQL can make a schema field as `deprecated` and this warns the client when they query that field. Thus, evolving a GraphQL schema is much easier.

These properties of a GraphQL API could be just as beneficial in an event driven architecture. Schema evolution for events and their payloads is possible in GraphQL Eventbus because the clients are only provided the fields that they explicitly ask for, just like a GraphQL API.

Second, a GraphQL API has a well defined schema that obviates the need for contract testing as opposed to a REST APIs which does not have a not a notion of schema fields. One can follow OpenAPIs best practices but that does not enforce the implementation of the schema. This property of GraphQL translates to GraphQL Eventbus. With a well defined schema, the chances of errors when publishing or consuming events are very low. Further, with code generation tools for GraphQL, we can further improve type safety in statically typed languages like typescript.

## Specification for Event based communication

While for REST APIs there are standards like OpenAPI, we do not have a standad for event based APIs. [Cloudevents](https://github.com/cloudevents/spec/blob/v1.0.1/primer.md) is a step in this direction.

> The lack of a common way of describing events means developers must constantly re-learn how to consume events. This also limits the potential for libraries, tooling and infrastructure to aide the delivery of event data across environments, like SDKs, event routers or tracing systems. The portability and productivity we can achieve from event data is hindered overall.
> CloudEvents is a specification for describing event data in common formats to provide interoperability across services, platforms and systems.

While cloudevents does have a promising specification, it does not provide any runtime guarantees. It's similar to OpenAPI: a specification that is hard to follow because nothing enforces runtime compliance with the specification. While this specification makes sense for public Event APIs, we believe that GraphQL Eventbus offers a lot more for building your enterprise event bus.

With a succinct specification and SDL, runtime type safety, in-built documentations, tooling, and beautiful GraphQL schema explorer (graphiql), GraphQL Eventbus is a much promising alternative that has all the good parts of `CloudEvents`.

## Subscribing to multiple topics using \*

There are many message brokers that allow the consumer to subscribe to multiple topics at once. For instance, `user.*` would subscribe to `user.create`, `user.update`, and `user.delete` topics. This is not a good practice though: how does the consumer differentiate between the distinct payloads for each of these events? It's better to create `UserCreateEvent`, `UserDeleteEvent` and `UserUpdateEvent` with their own payload field and subscribe to each of them individual to take advantage of `GraphQLEventbus`.
