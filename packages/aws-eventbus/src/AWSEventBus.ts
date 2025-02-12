import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import {
  SNSClient,
  ListTopicsCommand,
  CreateTopicCommand,
  SubscribeCommand,
  PublishCommand,
  ListTopicsCommandOutput,
  UnsubscribeCommand,
} from "@aws-sdk/client-sns";
import {
  SQSClient,
  GetQueueUrlCommand,
  CreateQueueCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  DeleteQueueCommand,
} from "@aws-sdk/client-sqs";
import { DocumentNode, GraphQLSchema } from "graphql";
import {
  Baggage,
  DataCb,
  EventBusPlugin,
  EventBusSubscriberCb,
  GraphQLEventbus,
  GraphQLEventbusMetadata,
} from "graphql-eventbus";
import { getS3 } from "./s3";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 } from "uuid";
import { Config } from "./config";

export type AWSEventBusConfig = {
  region: string;
  publisher?: {
    schema: GraphQLSchema;
  };
  subscriber?: {
    queries: DocumentNode;
    schema: GraphQLSchema;
    cb: EventBusSubscriberCb;
    skipTopics?: string[];
    includeTopics?: string[];
    fanoutTopics?: string[];
    /**
     * Maximum value: 20
     * Set to 0 for no wait
     */
    pollingTimeSeconds?: number;
    maxNumberOfMessages?: number;
    version?: string;
  };
  plugins?: EventBusPlugin[];
  serviceName: string;
  isDarkRelease?: boolean;
};

type SNSFilterPolicy = {
  [attribute: string]: Array<
    | { exists: boolean } // Existence check (e.g., { exists: false })
    | string // Exact string match (e.g., ["value1", "value2"])
    | { anythingBut: string[] } // Exclude certain values (e.g., { anythingBut: ["value1", "value2"] })
    | { numeric: { min?: number; max?: number } } // Numeric conditions (e.g., { numeric: { min: 5 } })
    | { prefix: string } // Prefix matching (e.g., { prefix: "v1" })
    | { suffix: string } // Suffix matching (e.g., { suffix: "end" })
  >;
};

export class AWSEventBus {
  public snsClient: SNSClient;
  public sqsClient: SQSClient;
  public stsClient: STSClient;
  private publishTopics: { [topicName: string]: string } = {};
  private closeSignal = false;
  private deleteSubscriptionsAndQueues: {
    subscriptionArn: string;
    queueUrl: string;
  }[] = [];
  private ongoingPublishes = new Set();
  private existingTopicsArns: ListTopicsCommandOutput | undefined;
  private bus: GraphQLEventbus;
  constructor(private config: AWSEventBusConfig) {
    this.snsClient = new SNSClient({
      region: config.region,
    });
    this.sqsClient = new SQSClient({
      region: config.region,
    });
    this.stsClient = new STSClient({ region: config.region });
    this.bus = new GraphQLEventbus({
      plugins: config.plugins,
      publisher: this.config.publisher
        ? {
            publishInit: async (topics) => {
              for (const topicName of topics) {
                // eslint-disable-next-line no-await-in-loop
                this.publishTopics[topicName] = await this.createTopic(
                  `graphql-eventbus-${topicName}`,
                );
              }
            },
            schema: this.config.publisher?.schema,
            publish: async (a) => {
              let message = JSON.stringify(a.baggage);
              const attributes = Object.entries(
                (
                  a.extra as {
                    attributes: Record<string, string> | undefined;
                  }
                ).attributes || {},
              ).reduce(
                (acc, [key, value]) => {
                  return {
                    ...acc,
                    [key]: {
                      DataType: "String",
                      StringValue: value,
                    },
                  };
                },
                // https://docs.aws.amazon.com/sns/latest/dg/attribute-key-matching.html
                // we must have a non empty attribute for filtering to work for non existing key
                {
                  dummy: {
                    DataType: "String",
                    StringValue: "dummy",
                  },
                },
              );
              const maxSize = 256 * 1024; // 256 KB SNS message limit
              const messageSize = Buffer.byteLength(message, "utf8");
              if (messageSize > maxSize) {
                console.log("large message detected...");
                const localS3 = getS3();
                const keyPrefix = Config.s3Prefix;
                const key = keyPrefix + "/" + v4() + ".json";
                console.log("uploading payload to ", key);
                const command = new PutObjectCommand({
                  Bucket: Config.bucket,
                  Key: key,
                  Body: message,
                });
                await localS3.send(command);
                console.log("payload uploaded");
                message = JSON.stringify({
                  __s3Key: key,
                });
              }
              const publishCommand = new PublishCommand({
                TopicArn: this.publishTopics[a.topic],
                Message: message, // The message content (JSON)
                MessageAttributes: attributes, // The attributes for the message,
              });
              await this.snsClient.send(publishCommand);
              const publishPromise = this.snsClient.send(publishCommand);
              this.ongoingPublishes.add(publishPromise);
              try {
                await publishPromise;
              } catch (e) {
                console.error(e);
                throw e;
              } finally {
                this.ongoingPublishes.delete(publishPromise);
              }
            },
          }
        : undefined,
      subscriber: this.config.subscriber
        ? {
            cb: this.config.subscriber?.cb,
            subscribe: async (allTopics, cb) => {
              let finalTopics = allTopics;
              if (this.config.subscriber?.includeTopics?.length) {
                finalTopics = allTopics.filter((t) =>
                  this.config.subscriber?.includeTopics?.includes(t),
                );
              }
              if (this.config.subscriber?.skipTopics?.length) {
                finalTopics = allTopics.filter(
                  (t) => !this.config.subscriber?.skipTopics?.includes(t),
                );
              }
              await finalTopics.reduce(async (acc, topicName) => {
                const topicArn = await this.createTopic(
                  `graphql-eventbus-${topicName}`,
                );
                let subscriptionName = `graphql-eventbus-${
                  this.config.serviceName
                }-${topicName}${this.config.isDarkRelease ? "-dark" : ""}`;
                if (this.config.subscriber?.version) {
                  subscriptionName = `graphql-eventbus-${this.config.serviceName}-${topicName}-${this.config.subscriber?.version}`;
                }
                const isFanout =
                  this.config.subscriber?.fanoutTopics?.includes(topicName);
                // we use a different subscription name for each instance of the service for a fanout topic
                if (isFanout) {
                  subscriptionName = `graphql-eventbus-${
                    this.config.serviceName
                  }-${topicName}-${Math.random().toString().split(".")[1]}${
                    this.config.isDarkRelease ? "-dark" : ""
                  }`;
                  if (this.config.subscriber?.version) {
                    subscriptionName = `graphql-eventbus-${
                      this.config.serviceName
                    }-${topicName}-${Math.random().toString().split(".")[1]}-${
                      this.config.subscriber?.version
                    }`;
                  }
                }
                const { queueArn, queueUrl } = await this.createQueue(
                  subscriptionName,
                  topicArn,
                );
                let filterPolicy: SNSFilterPolicy = {
                  [`x-prop-${this.config.serviceName}-dark`]: [
                    { exists: false },
                  ],
                  [`x-prop-${this.config.serviceName}-version`]: [
                    { exists: false },
                  ],
                };
                if (this.config.isDarkRelease) {
                  filterPolicy = {
                    [`x-prop-${this.config.serviceName}-dark`]: ["true"],
                  };
                }
                if (this.config.subscriber?.version) {
                  filterPolicy = {
                    [`x-prop-${this.config.serviceName}-version`]: [
                      this.config.subscriber?.version,
                    ],
                  };
                }
                const subscribeCommand = new SubscribeCommand({
                  TopicArn: topicArn,
                  Protocol: "sqs",
                  Endpoint: queueArn,
                  Attributes: {
                    FilterPolicy: JSON.stringify(filterPolicy),
                    FilterPolicyScope: "MessageAttributes",
                  },
                });
                const response = await this.snsClient.send(subscribeCommand);
                if (isFanout) {
                  response.SubscriptionArn &&
                    this.deleteSubscriptionsAndQueues.push({
                      queueUrl: queueUrl,
                      subscriptionArn: response.SubscriptionArn,
                    });
                }
                this.pollQueue(queueUrl, topicName, cb);
                return acc.then(() => Promise.resolve());
              }, Promise.resolve());
            },
            queries: this.config.subscriber.queries,
            schema: this.config.subscriber.schema,
          }
        : undefined,
    });
  }
  private receiveMessageFromQueue = async (
    queueUrl: string,
    cb: (baggage: Baggage) => Promise<void>,
  ) => {
    try {
      // Receive messages from the queue
      const receiveMessageCommand = new ReceiveMessageCommand({
        QueueUrl: queueUrl, // The URL of the SQS queue
        MaxNumberOfMessages: this.config.subscriber?.maxNumberOfMessages ?? 10, // Number of messages to retrieve (max is 10)
        WaitTimeSeconds: this.config.subscriber?.pollingTimeSeconds ?? 20, // Long polling (wait for messages up to 20 seconds)
        VisibilityTimeout: 30, // The time for which a message is hidden after being received
        AttributeNames: ["All"], // Optionally retrieve additional message attributes
        MessageAttributeNames: ["All"], // Optionally retrieve all message attributes
      });

      // Send the command to receive the message
      const response = await this.sqsClient.send(receiveMessageCommand);
      for (const message of response.Messages || []) {
        const messageBody = JSON.parse(message.Body || "");
        // Process the message
        // Your custom logic for processing the message goes here
        cb(JSON.parse(messageBody.Message)).then(() => {
          const deleteMessageCommand = new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle, // Required to delete the message
          });
          // Delete the message from the queue to avoid reprocessing it
          this.sqsClient.send(deleteMessageCommand);
        });
      }
    } catch (error) {
      if (this.closeSignal) {
        return;
      }
      console.error("Error receiving or deleting message:", error);
    }
  };
  private pollQueue = async (
    queueUrl: string,
    topicName: string,
    cb: DataCb,
  ) => {
    const foo = () =>
      this.receiveMessageFromQueue(queueUrl, async (baggage) => {
        if ("__s3Key" in baggage) {
          const command = new GetObjectCommand({
            Bucket: Config.bucket,
            Key: baggage["__s3Key"] as string,
          });
          const response = await getS3().send(command);
          if (!response.Body) {
            return;
          }
          try {
            baggage = JSON.parse(
              await response.Body.transformToString("utf-8"),
            );
          } catch (e) {
            console.error(
              `Error in parsing the baggage payload for key ${baggage["__s3Key"]}`,
            );
            return;
          }
        }
        await cb({
          topic: topicName,
          baggage: {
            metadata: baggage.metadata,
            payload: baggage.payload,
          },
        });
      });
    while (!this.closeSignal) {
      await foo();
    }
    // this.pollTimers.push(setInterval(foo, 1000));
  };
  private createTopic = async (topicName: string): Promise<string> => {
    if (!this.existingTopicsArns) {
      this.existingTopicsArns = await this.snsClient.send(
        new ListTopicsCommand({}),
      );
    }
    let topicArn: string | undefined;
    for (const topic of this.existingTopicsArns.Topics || []) {
      if (topic.TopicArn?.endsWith(`:${topicName}`)) {
        topicArn = topic.TopicArn;
        console.log(`Topic already exists for: ${topicName}`);
        break;
      }
    }
    if (!topicArn) {
      // eslint-disable-next-line no-await-in-loop
      const createTopicResponse = await this.snsClient.send(
        new CreateTopicCommand({ Name: topicName }),
      );
      topicArn = createTopicResponse.TopicArn;
    }
    if (!topicArn) {
      throw new Error(`Topic creation failed for topic ${topicArn}`);
    }
    return topicArn;
  };
  private createQueue = async (
    queueName: string,
    topicArn: string,
  ): Promise<{
    queueUrl: string;
    queueArn: string;
  }> => {
    let queueUrl;
    try {
      // Step 1: Check if the queue already exists
      const getQueueUrlResponse = await this.sqsClient.send(
        new GetQueueUrlCommand({ QueueName: queueName }),
      );
      queueUrl = getQueueUrlResponse.QueueUrl;
      console.log(`Queue already exists with URL: ${queueUrl}`);
    } catch (error) {
      if (error instanceof Error && error.name === "QueueDoesNotExist") {
        console.log(`Queue does not exist. Creating queue: ${queueName}`);
        const stsResponse = await this.stsClient.send(
          new GetCallerIdentityCommand({}),
        );
        const accountId = stsResponse.Account;
        const queueArn = `arn:aws:sqs:${this.config.region}:${accountId}:${queueName}`;
        const policy = {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: "*",
              Action: "SQS:SendMessage",
              Resource: queueArn,
              Condition: {
                ArnEquals: {
                  "aws:SourceArn": topicArn, // Restrict access to the specific SNS topic ARN
                },
              },
            },
          ],
        };
        const createQueueResponse = await this.sqsClient.send(
          new CreateQueueCommand({
            QueueName: queueName,
            Attributes: {
              Policy: JSON.stringify(policy),
            },
          }),
        );
        queueUrl = createQueueResponse.QueueUrl;
        console.log(`Queue created with URL: ${queueUrl}`);
      } else {
        console.error("Error finding or creating queue:", error);
        throw error;
      }
    }
    if (!queueUrl) {
      throw new Error(`queue creation failed ${queueName}`);
    }
    const getQueueAttributesResponse = await this.sqsClient.send(
      new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ["QueueArn"], // Specify that you want the QueueArn attribute
      }),
    );
    const queueArn = getQueueAttributesResponse.Attributes?.QueueArn;
    if (!queueArn) {
      throw new Error(`queue ARN retrieval failed ${queueArn}`);
    }
    return {
      queueArn,
      queueUrl,
    };
  };
  closeConsumer = async () => {
    this.closeSignal = true;
    await Promise.all(
      this.deleteSubscriptionsAndQueues.map(
        async ({ queueUrl, subscriptionArn }) => {
          console.log(
            `deleting queue ${queueUrl} and subscription ${subscriptionArn}`,
          );
          const unsubscribeCommand = new UnsubscribeCommand({
            SubscriptionArn: subscriptionArn,
          });
          await this.snsClient.send(unsubscribeCommand);
          const deleteQueueCommand = new DeleteQueueCommand({
            QueueUrl: queueUrl,
          });
          await this.sqsClient.send(deleteQueueCommand);
        },
      ),
    ).catch(console.error);
  };
  closePublisher = async () => {
    await Promise.all(this.ongoingPublishes);
  };
  init = () => {
    return this.bus.init();
  };
  publish = async (a: {
    topic: string;
    payload: Record<string, unknown>;
    metadata?: Partial<GraphQLEventbusMetadata>;
    attributes?:
      | {
          [k: string]: string;
        }
      | null
      | undefined;
  }) => {
    await this.bus.publish({
      payload: a.payload,
      topic: a.topic,
      metadata: a.metadata,
      extra: {
        attributes: a.attributes,
      },
    });
  };
}
