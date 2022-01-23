---
sidebar_position: 3
---

# Code Generation

`graphql-eventbus-codegen` is a [GraphQL Codegen](https://www.graphql-code-generator.com/docs/getting-started) plugin to generate typescript types for event handlers, event publishers, and event samplers to assist with generating mock data for testing.

The plugin is meant to be used with `typescript` and `typescript-operations` plugins. The config object received by the plugin is

```typescript
interface Config {
  consumer?: {
    contextType: string;
    schemaPrintPath?: string;
    eventSampler?: boolean;
  };
  publisher?: boolean;
}
```

## Consumer

Use this option if you want to generate code for consuming events.

- `contextType`: Relative path to import a custom context object that will be passed to the event handlers. The path is relative to where the generated file is located.
- `schemaPrintPath`: Path to print the composed schema. If the consumer is consuming events from multiple schemas (each one could be published by individual service), you may want to print the composed schema which can be used when creating an instance of your bus.
- `eventSampler`: Boolean. This option can be used to generate code to sample events using `Validator` class exported by the core library. It creates a function type (EventSampler) that can be assigned to data sampler. [See an example](https://github.com/quant-daddy/graphql-eventbus/blob/master/examples/google-pubsub/src/serviceB/utils/sampleEventData.ts).

## Publisher

Use this option to generate the signature of a function to publish events. This is a boolean.

## Note

Note that the schema used to consume events will likely be different from the scheme of events that the service publishes (unless it is consuming its own events using `MemoryEventBus`). Therefore, in most cases, consumer and publisher generated files would be different. Be careful to only specify only one of the options for each generated file, unless the bus is consuming the same set of events that it is publishing.

## Sample Config

```yaml
schema: ""
generates:
  ./src/serviceB/generated/codegen-event-consumer.ts:
    plugins:
      - graphql-eventbus-codegen:
          consumer:
            eventSampler: true
            contextType: "../bus#MessageHandlerContext"
            schemaPrintPath: "./src/serviceB/generated/publisher.graphql"
      - typescript
      - typescript-operations
    documents:
      - "./src/serviceB/event-consumer.graphql"
    schema:
      - "src/serviceA/schema-event.graphql"
      - "src/serviceB/schema-event.graphql"
      - "src/serviceC/schema-event.graphql"
    config:
      skipTypename: true
  ./src/serviceA/generated/codegen-event-publisher.ts:
    plugins:
      - typescript
      - typescript-operations
      - graphql-eventbus-codegen:
          publisher: true
    schema:
      - "src/serviceA/schema-event.graphql"
    config:
      skipTypename: true
      enumsAsTypes: true
```
