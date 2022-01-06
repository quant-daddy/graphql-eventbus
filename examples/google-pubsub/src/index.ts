import express from "express";
import { v4 } from "uuid";
import wait from "waait";
import { register } from "graphql-eventbus-google-pubsub";
import { getPublish, initEventBus } from "./eventbus";

const foo = async () => {
  await initEventBus();
  const publish = getPublish();
  if (Math.random() > 0.5) {
    await publish({
      event: "UserCreatedEvent",
      payload: {
        createdAt: new Date().toISOString(),
        userEmail: "a@b.com",
        userId: "123",
        userName: "Suraj",
        eventId: v4(),
        userType: "ENTERPRISE",
      },
    });
  } else {
    try {
      await publish({
        event: "UserCreatedEvent",
        // ignore bad payload
        // @ts-ignore
        payload: {
          createdAt: new Date().toISOString(),
          userEmail: "a@b.com",
          userId: "123",
          userType: "ENTERPRISE",
        },
      });
    } catch (e) {
      console.log(`Publishing bad payload failed`);
    }
  }
  await wait(1000);
};

(async () => {
  const app = express();
  app.get("/event-metrics", async (_, res) => {
    res.set("Content-Type", register.contentType);
    res.send(await register.metrics());
  });
  app.listen(8000, () => {
    console.log("app listening");
  });
  setInterval(() => foo(), 5000);
  // await eventBus.closeConsumer();
  // await eventBus.closePublisher();
})();
