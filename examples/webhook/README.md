This example illustrates how to use `MemoryEventBus` to consume webhooks in a type-safe way.

## Define the schema

Start by defining a GraphQL schema that has all the events and corresponding fields that you might receive from the webhook.

## Write Documents

Write graphQL documents that subscribes to the events and received the payload.

## Code Generation

Use the `graphql-eventbus-codegen` plugin to generate code so everything is type safe.

In this example, we listen to GET http webhook at `/webbook` with a JSON payload with fields `event` and `payload`. See `src/app.ts` for details.
