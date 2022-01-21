---
sidebar_position: 1
---

# Metrics Plugin

Metrics plugin prometheus metrics for your event bus. To use it, you must have installed `prom-client` required as a npm peer dependency.

```bash
npm i graphql-eventbus-metrics-plugin
# Peer dependency
npm i prom-client
```

```typescript
import { MetricsPlugin } from 'graphql-eventbus-metrics-plugin'
const myBus = new MyBus({
  ...,
  plugins: [MetricsPlugin()]
})
```

```typescript title="router.ts"
import { register } from "prom-client";
import * as express from "express";

const app = express();
app.get("/metrics", async (_, res) => {
  res.set("Content-Type", register.contentType);
  res.send(await register.metrics());
});
```

This plugins exposes the follwing metrics:

### `message_published_total`

The number of messages published without error

### `message_published_error_total`

The number of messages published that have encountered errors.

### `message_consumed_total`

The number of messages published that have encountered errors.

### `message_consumed_error_total`

The number of messages consumed that encountered an error

### `message_consumed_duration_ms`

The time to consume a message successfully

### `message_consumed_since_publish_duration_ms`

The time to consume a message successfully since it was first published. We track this metrics using `publishedAt` field in the `GraphQLEventbusMetadata`.

### `message_publish_duration_ms`

The time it takes to publish a message in ms.
