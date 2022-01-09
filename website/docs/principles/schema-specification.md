---
sidebar_position: 3
---

# Schema Specification

There are a certain rules that must be followed when defining a schema for GraphQL Eventbus. This is based on the default resolver for each field of a GraphQL schema which returns the field itself. Any field/type that requires a custom resolver is not allowed. Custom Scalar is an exception to this rule. If you define a custom scalar in your schema (`DateTime` for instance), you should provive a resolver for that scalar in the `GraphQLSchema`. Otherwise, any value would be accepted for that scalar.

- Each published event must have a name under the root `Query` field in the SDL.
- The return type of each event (i.e. the type of each field of the root query field) must be a non-null object.
- `Mutation` root field is not allowed.
- Abstract types like `Union` and `Interface` are not allowed.
- Arguments are not allowed for any field.
- Input type is not allowed

This enables us to publish simple JSON payload, including custom scalars.
