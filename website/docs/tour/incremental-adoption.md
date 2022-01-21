---
sidebar_position: 6
---

# Incremental Adoption

GraphQLEventbus can be added incrementally to an existing event based architecture. Once you build your own bus or use one of the existing buses, you can plug it in into each of your services one at a time. It already brings a lot of benefits:

- Code Generation and type safety
- Visibility into what field are being used by each your event handlers. Once adopted by all your service, you can easily remove fields without breaking the contract.
- Plugins for prometheus metrics and logging.
- Documentation: You can use [GraphiQL](https://github.com/graphql/graphiql) to explore your event schema.
- Testing utilities to test each event handler with mock data generator
- Standardzing the signature of function to publish and consume events across your organization.

## Consumer

For consuming events, start with defining the schema of events that the service want to consume. Then, define GraphQL document for each of the events and their individual fields. Finally, to use the codegen plugin, refactor each of your event handlers with the following format: the first argument is the payload and second argument is your custom context object.

```typescript
const userCreatedEventHandler = async (
  msg: UserCreatedEventPayload,
  ctx: MyContext,
) => {};
```

As long as your existing message broker can be used to trigger the event handler for individual events with the payload specified in the schema, you can start using GraphQLEventbus.

## Publisher

For publishing events, start with defining the schema of events that the service wants to publish. This involves defining each event and its payload in the [GraphQL schema format](/docs/principles/schema-specification). As long as your existing message broker can be used to publish individual events as topics with corresponding payload, you can use `GraphQLEventbus`. Finally, you can use the codegen plugin which generates the following signature for the publish function:

```typescript
type EventA {
  id: string
  name: string
}
type EventB {
  id: string
  address: string
}
function publish(
  args:
    | { topic: "EventA"; payload: EventA }
    | { topic: "EventB"; payload: EventB }
): Promise<void>;

export type Publish = typeof publish
```
