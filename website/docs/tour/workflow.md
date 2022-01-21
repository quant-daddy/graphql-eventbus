---
sidebar_position: 5
---

# Workflow

We have a [graphql-codegen](https://www.graphql-code-generator.com/) library for code generation for event handlers and event publisher.

## Dependencies

```bash
npm i -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations
```

## Installation

```bash
npm i -D graphql-eventbus-codegen
```

Code generator needs a `yaml` config file. In the sample file below, we are generating code for event handlers (for consuming events) and event publisher. Note that we are generating code for publisher (`./src/generated/codegen-event-publisher.ts`) and consumers (`./src/generated/codegen-event-consumer.ts`) in separate files. For the publisher, the input is the schema of events it publishes (`src/schema.event.graphql`). We use the `publisher: true` flag for `graphql-eventbus-codegen` plugin. For event consumer, we specify the URI of schemas: here we are downloading the schemas from Github for instance. We also need to specify the graphQL documents which has all the events the service is consuming. Finally, we use the conumer config for `graphql-eventbus-codegen` plugin. We specify our custom context object for the event handlers. We also specify a path to print the composed event schema that we are consuming. This schema will be used as an input to the event bus.

```yaml codegen.yaml
schema: ""
generates:
  ./src/generated/codegen-event-publisher.ts:
    plugins:
      - typescript
      - graphql-eventbus-codegen:
          publisher: true
    schema:
      - "src/schema.event.graphql"
    config:
      skipTypename: true
      enumsAsTypes: true
  ./src/generated/codegen-event-consumer.ts:
    plugins:
      - graphql-eventbus-codegen:
          consumer:
            eventSampler: true
            contextType: "../types#MessageHandlerContext"
            schemaPrintPath: "src/generated/event-publisher.graphql"
      - typescript
      - typescript-operations:
    documents:
      - "./src/event-handlers/event-consumer.graphql"
    schema:
      - ${SERVICEA_SCHEMA_URL}:
          token: ${GITHUB_TOKEN}
          headers: ${HEADERS}
      - ${SERVICEB_SCHEMA_URL}:
          token: ${GITHUB_TOKEN}
          headers: ${HEADERS}
    config:
      skipTypename: true
```

The signature of a `publish` function is generated like so:

```typescript
function publish(
  data:
    | { topic: "UserCreatedEvent"; payload: UserCreatedEvent }
    | { topic: "UserDeletedEvent"; payload: UserDeletedEvent },
): Promise<void>;
function publish(): Promise<void> {
  return Promise.resolve();
}

export type Publish = typeof publish;
```

The signature of the event handler functions is generated like so:

```typescript
export interface EventHandlers {
  UserCreatedEvent: (
    msg: UserCreatedEventQuery["UserCreatedEvent"],
    ctx: MessageHandlerContext,
  ) => Promise<any>;
}
```

Each event handler function is passed the data that they queried as the first argument, and a context object as the second argument.
