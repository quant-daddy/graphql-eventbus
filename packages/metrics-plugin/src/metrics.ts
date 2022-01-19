import { EventBusPlugin } from "graphql-eventbus";
import { register } from "prom-client";
import { Counter, Histogram } from "prom-client";

const publishCount = new Counter({
  name: "message_published_total",
  help: "The number of messages published without error",
  labelNames: ["name"],
  registers: [register],
});

const publishErrorCount = new Counter({
  name: "message_published_error_total",
  help: "The number of messages published that have encountered errors.",
  labelNames: ["name"],
  registers: [register],
});

const consumedCount = new Counter({
  name: "message_consumed_total",
  help: "The number of messages consumed without error",
  labelNames: ["name"],
  registers: [register],
});

const consumedErrorCount = new Counter({
  name: "message_consumed_error_total",
  help: "The number of messages consumed that encountered an error",
  labelNames: ["name"],
  registers: [register],
});

const consumedTime = new Histogram({
  name: "message_consumed_duration_ms",
  help: "The time to consume a message successfully",
  labelNames: ["name"],
  registers: [register],
});

const consumedTimeSincePublish = new Histogram({
  name: "message_consumed_since_publish_duration_ms",
  help: "The time to consume a message successfully since it was first published",
  labelNames: ["name"],
  registers: [register],
});

const publishTime = new Histogram({
  name: "message_publish_duration_ms",
  help: "The time it takes to publish a message",
  labelNames: ["name"],
  registers: [register],
});

export const MetricsPlugin = (): EventBusPlugin => {
  const plugin: EventBusPlugin = {
    consumeStartHook: (a) => {
      const startTime = new Date().getTime();
      return {
        consumeErrorHook: () => consumedErrorCount.inc({ name: a.topic }),
        consumeSuccessHook: () => {
          consumedCount.inc({ name: a.topic });
          consumedTimeSincePublish.observe(
            { name: a.topic },
            new Date().getTime() - startTime,
          );
          consumedTime.observe(
            { name: a.topic },
            new Date().getTime() - startTime,
          );
        },
      };
    },
    publishStartHook: (a) => {
      const startTime = new Date().getTime();
      return {
        publishErrorHook: () => publishErrorCount.inc({ name: a.topic }),
        publishSuccessHook: () => {
          publishTime.observe(
            { name: a.topic },
            new Date().getTime() - startTime,
          );
          publishCount.inc({ name: a.topic });
        },
      };
    },
  };
  return plugin;
};
