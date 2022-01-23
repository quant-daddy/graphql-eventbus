---
sidebar_position: 2
---

# Plugin

GraphQL Eventbus provides access to various stages of the lifecycle of consuming and publishing an event. It implements the `EventBusPlugin` interface. [See this file](https://github.com/quant-daddy/graphql-eventbus/blob/master/packages/core/src/GraphQLEventbus.ts#L71) for details.

```typescript
type OptionalPromise<T> = T | Promise<T> | undefined | null | void;

export type ConsumeEndHook = () => OptionalPromise<unknown>;

export type ConsumeSuccessHook = () => OptionalPromise<unknown>;

export type ConsumeErrorHook = (error: Error) => OptionalPromise<unknown>;

export type ConsumeStartHook = (args: {
  topic: string;
  _fullData: {};
  documentNode: DocumentNode;
  metadata: GraphQLEventbusMetadata;
}) => OptionalPromise<{
  consumeEndHook?: ConsumeEndHook;
  consumeErrorHook?: ConsumeErrorHook;
  consumeSuccessHook?: ConsumeSuccessHook;
}>;

export type PublishEndHook = () => OptionalPromise<unknown>;

export type PublishSuccessHook = () => OptionalPromise<unknown>;

export type PublishErrorHook = (error: Error) => OptionalPromise<unknown>;

export type PublishStartHook = (args: {
  topic: string;
  payload: {};
  metadata: GraphQLEventbusMetadata;
}) => OptionalPromise<{
  publishEndHook?: PublishEndHook;
  publishErrorHook?: PublishErrorHook;
  publishSuccessHook?: PublishSuccessHook;
}>;

export interface EventBusPlugin {
  consumeStartHook?: ConsumeStartHook;
  publishStartHook?: PublishStartHook;
}
```
