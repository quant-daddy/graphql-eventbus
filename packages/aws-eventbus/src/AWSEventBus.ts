import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import {
  SNSClient,
  ListTopicsCommand,
  CreateTopicCommand,
  SubscribeCommand,
  PublishCommand,
  ListTopicsCommandOutput,
} from "@aws-sdk/client-sns";
import {
  SQSClient,
  GetQueueUrlCommand,
  CreateQueueCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
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
  };
  plugins?: EventBusPlugin[];
  serviceName: string;
  isDarkRelease?: boolean;
};

export class AWSEventBus {
  public snsClient: SNSClient;
  public sqsClient: SQSClient;
  public stsClient: STSClient;
  private publishTopics: { [topicName: string]: string } = {};
  private pollTimers: NodeJS.Timer[] = [];
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
              const message = JSON.stringify(a.baggage);
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
              const publishCommand = new PublishCommand({
                TopicArn: this.publishTopics[a.topic],
                Message: message, // The message content (JSON)
                MessageAttributes: attributes, // The attributes for the message,
              });
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
                // we use a different subscription name for each instance of the service for a fanout topic
                if (this.config.subscriber?.fanoutTopics?.includes(topicName)) {
                  subscriptionName = `graphql-eventbus-${
                    this.config.serviceName
                  }-${topicName}-${Math.random().toString().split(".")[1]}${
                    this.config.isDarkRelease ? "-dark" : ""
                  }`;
                }
                const { queueArn, queueUrl } = await this.createQueue(
                  subscriptionName,
                  topicArn,
                );
                const subscribeCommand = new SubscribeCommand({
                  TopicArn: topicArn,
                  Protocol: "sqs",
                  Endpoint: queueArn,
                  Attributes: {
                    FilterPolicy: JSON.stringify(
                      !this.config.isDarkRelease
                        ? {
                            [`x-prop-${this.config.serviceName}-dark`]: [
                              { exists: false },
                            ],
                          }
                        : {
                            [`x-prop-${this.config.serviceName}-dark`]: [
                              "true",
                            ],
                          },
                    ),
                    FilterPolicyScope: "MessageAttributes",
                  },
                });
                await this.snsClient.send(subscribeCommand);
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
        MaxNumberOfMessages: 1, // Number of messages to retrieve (max is 10)
        WaitTimeSeconds: this.config.subscriber?.pollingTimeSeconds ?? 5, // Long polling (wait for messages up to 20 seconds)
        VisibilityTimeout: 30, // The time for which a message is hidden after being received
        AttributeNames: ["All"], // Optionally retrieve additional message attributes
        MessageAttributeNames: ["All"], // Optionally retrieve all message attributes
      });

      // Send the command to receive the message
      const response = await this.sqsClient.send(receiveMessageCommand);

      if (response.Messages && response.Messages.length > 0) {
        const message = response.Messages[0];
        const messageBody = JSON.parse(message.Body || "");
        // Process the message
        // Your custom logic for processing the message goes here
        await cb(JSON.parse(messageBody.Message));
        // Delete the message from the queue to avoid reprocessing it
        const deleteMessageCommand = new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: message.ReceiptHandle, // Required to delete the message
        });
        await this.sqsClient.send(deleteMessageCommand);
      }
    } catch (error) {
      console.error("Error receiving or deleting message:", error);
    }
  };
  private pollQueue = (queueUrl: string, topicName: string, cb: DataCb) => {
    const foo = () =>
      this.receiveMessageFromQueue(queueUrl, async (baggage) => {
        await cb({
          topic: topicName,
          baggage: {
            metadata: baggage.metadata,
            payload: baggage.payload,
          },
        });
      });
    foo();
    this.pollTimers.push(setInterval(foo, 20000));
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
    this.pollTimers.forEach((timer) => {
      clearInterval(timer);
    });
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
