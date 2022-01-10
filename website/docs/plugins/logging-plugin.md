---
sidebar_position: 2
---

# Logging Plugin

The library exports a default logging plugin that you can add your event bus to get standard logging out of the box. Please [find the details here](https://github.com/skk2142/graphql-eventbus/blob/master/packages/core/src/LoggingPlugin.ts).

```typescript
import { LoggingPlugin } from 'graphql-eventbus'
const myBus = new MyBus({
  ...,
  plugins: [LoggingPlugin()]
})
```
