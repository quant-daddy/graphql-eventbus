import wait from "waait";
import { UserType } from "./generated/codegen-event-consumer";
import { getConsumerTestEventBus } from "./utils/getTestEventBus";
import { sampleEventData } from "./utils/sampleEventData";

describe("EventHandlers", () => {
  test("UserCreatedEvent is handled correctly", async () => {
    const publishCb = jest.fn();
    const bus = await getConsumerTestEventBus({
      publish: publishCb,
    });
    const payload = await sampleEventData({
      topic: "UserCreatedEvent",
      override: {
        userType: UserType.Enterprise,
      },
    });
    await bus.publish({
      event: "UserCreatedEvent",
      payload,
    });
    await wait(100);
    expect(publishCb).toBeCalledTimes(1);
    expect(publishCb.mock.calls[0][0].event).toMatchInlineSnapshot(
      `"SendEmailEvent"`,
    );
    expect(publishCb.mock.calls[0][0].payload.emailAddress).toBe(
      payload.userEmail,
    );
    publishCb.mockClear();
    await bus.publish({
      event: "UserCreatedEvent",
      payload: sampleEventData({
        topic: "UserCreatedEvent",
        override: {
          userEmail: null,
        },
      }),
    });
    await wait(100);
    expect(publishCb).not.toBeCalled();
  });
});
