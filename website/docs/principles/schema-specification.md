---
sidebar_position: 3
---

# Schema Specification

There are a certain rules that must be followed when defining a schema for GraphQL Eventbus. This is based on the default resolver for each field of a GraphQL schema which returns the field itself. Any field/type that requires a custom resolver is not allowed. Custom Scalar is an exception to this rule. If you define a custom scalar in your schema (`DateTime` for instance), you should provive a resolver for that scalar in the `GraphQLSchema`. Otherwise, any value would be accepted for that scalar.

- Each published event must have a name under the root `Query` field in the SDL.
- The return type of each event (i.e. the type of each field of the root query field) must be a non-null object.
- `Mutation` root field is not allowed.
- Abstract types like `Union` and `Interface` are not allowed. The reason being the graphql executor requirer a resolver function to resolve the abstract types, which makes the architecture more complex.
- Arguments are not allowed for any field.
- Input type is not allowed

This enables us to publish simple JSON payload, including custom scalars.

## Best Practices

- When consuming events, only query for fields that the event handler needs.
- Use non-null fields only when you have to. Note that if a non-null field is invalid when being consumed, this makes the whole payload null. This throws a runtime exception.
- For `enums`, it's best to keep them nullable. When a new value is added to the enum values and is published by the published, the consumer service, unless updated with the latest schema, will encounter an error and set the field to be null. If the field is non nullable, this will make the whole payload null.
