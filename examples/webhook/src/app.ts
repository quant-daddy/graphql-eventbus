import express from "express";
import { register } from "prom-client";
import { initEventBus, publish } from "./WebhookBus";

const app = express();
app.get("/event-metrics", async (_, res) => {
  res.set("Content-Type", register.contentType);
  res.send(await register.metrics());
});
app.use(express.json());
app.post("/webhook", async (req, res) => {
  try {
    await publish(
      {
        event: req.body.event,
        payload: req.body.payload,
      },
      // @ts-ignore
      req.body,
    );
    res.sendStatus(201);
    return;
  } catch (e) {
    console.error(e);
  }
  res.sendStatus(202);
});

const init = async () => {
  await initEventBus();
  app.listen(3000, () => {
    console.log(`listening on port 3000`);
  });
};

init();
