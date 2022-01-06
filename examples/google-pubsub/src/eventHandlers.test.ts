import { UserType } from "./generated/codegen-event-consumer";
import { getTestEventBus } from "./utils/getTestEventBus";
import { sampleEventData } from "./utils/sampleEventData";

describe("EventHandlers", () => {
  test("UserCreatedEvent works", async () => {
    const bus = await getTestEventBus();
    const payload = await sampleEventData({
      event: "UserCreatedEvent",
      override: {
        userType: UserType.Enterprise,
      },
    });
    await bus.publish({
      event: "UserCreatedEvent",
      payload,
    });
  });
  test("UserCreatedEvent works", async () => {
    const bus = await getTestEventBus();
    const payload = await sampleEventData({
      event: "UserCreatedEvent",
    });
    await bus.publish({
      event: "UserCreatedEvent",
      payload,
    });
  });
});
