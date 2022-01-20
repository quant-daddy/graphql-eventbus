import { v4 } from "uuid";
import { getPublish, initServiceAEventBus } from "./serviceA/bus";
import { initServiceBEventBus } from "./serviceB/bus";
import { initServiceCEventBus } from "./serviceC/bus";

const serviceAPublish = getPublish();

const foo = async () => {
  await initServiceAEventBus();
  await initServiceBEventBus();
  await initServiceCEventBus();
  setInterval(() => {
    serviceAPublish({
      topic: "UserCreatedEvent",
      payload: {
        createdAt: new Date().toISOString(),
        eventId: v4(),
        userEmail: "elonmust@gmail.com",
        userId: "1231",
        userName: "Elon Must",
        userType: "ENTERPRISE",
      },
    });
  }, 5000);
};

foo();
