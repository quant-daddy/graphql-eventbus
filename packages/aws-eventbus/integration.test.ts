import { buildSchema } from "graphql";
import { LoggingPlugin } from "graphql-eventbus";
import gql from "graphql-tag";
import wait from "waait";
import { AWSEventBus } from "./dist/index";

// Before running this test, start google pubsub locally
// docker run --rm --tty --interactive --publish 8538:8538 bigtruedata/gcloud-pubsub-emulator start --host-port=0.0.0.0:8538
describe("AWS Eventbus integration test", () => {
  test("publist topics are created", async () => {
    if (process.env.IS_CI === "true") {
      console.log(`Skipping in Github Actions`);
      return;
    }
    const schema = buildSchema(`
    type TopicA {
      id: String!
    }
    type TopicB {
      id: String!
    }
    type Query {
      TopicA: TopicA!
      TopicB: TopicB!
    }
  `);
    const cb = jest.fn();
    const bus = new AWSEventBus({
      region: "us-east-1",
      serviceName: "test",
      publisher: {
        schema,
      },
      subscriber: {
        cb: async (p) => {
          cb(p.payload);
          return;
        },
        queries: gql`
          query TopicA {
            TopicA {
              id
            }
          }
          query TopicB {
            TopicB {
              id
            }
          }
        `,
        schema,
      },
      plugins: [LoggingPlugin()],
    });
    await bus.init();
    await bus.publish({
      topic: "TopicA",
      payload: {
        id: "myid",
      },
    });
    await wait(1000);
    expect(cb).toBeCalledTimes(1);
  });
});
