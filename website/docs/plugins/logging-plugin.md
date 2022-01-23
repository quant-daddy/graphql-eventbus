---
sidebar_position: 2
---

# Logging Plugin

The library exports a default logging plugin that you can add your event bus to get standard logging out of the box. Please [find the details here](https://github.com/quant-daddy/graphql-eventbus/blob/master/packages/core/src/LoggingPlugin.ts). It publishes events in a standard format similar to a REST API

```sh
[RECEIVED_TIME | PUBLISH_TIME] "EVENT_NAME (PUBLISH | CONSUME)"
(OK | DEPRECATED | ERROR) DURATION "X-REQUEST-ID" "EVENT-ID"
```

```typescript
import { LoggingPlugin } from 'graphql-eventbus'
const myBus = new MyBus({
  ...,
  plugins: [LoggingPlugin()]
})
```
