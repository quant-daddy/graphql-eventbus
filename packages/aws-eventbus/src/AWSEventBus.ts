import * as crypto from "crypto";
import { S3 } from "@aws-sdk/client-s3";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import {
  SNSClient,
  CreateTopicCommand,
  SubscribeCommand,
  PublishCommand,
  UnsubscribeCommand,
} from "@aws-sdk/client-sns";
import {
  SQSClient,
  CreateQueueCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  DeleteQueueCommand,
  GetQueueUrlCommand,
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
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 } from "uuid";
import wait from "waait";

/**
 * Compresses an event name to a maximum of 30 characters if its length exceeds 40 characters.
 * Otherwise, returns the original name unchanged.
 */
function compressEventIfNeeded(name: string, maxLen = 42): string {
  if (name.length <= maxLen) {
    return name;
  }

  // 1. Generate 4-character MD5 hash of original string
  const shortHash = crypto
    .createHash("md5")
    .update(name)
    .digest("hex")
    .substring(0, 4);

  // Target length for readable prefix: 30 - 1 separator - 4 hash = 25 chars
  const prefixTargetLen = maxLen - 1 - shortHash.length;

  // 2. Split PascalCase / camelCase / hyphens / underscores
  const tokens = name.match(/[A-Z]?[a-z0-9]+|[A-Z]+(?=[A-Z][a-z]|\d|\b)/g) || [
    name,
  ];

  // 3. Strip inner vowels from words longer than 3 characters
  const shortened = tokens.map((word) => {
    if (word.length > 3) {
      return word[0] + word.slice(1).replace(/[aeiouAEIOU]/g, "");
    }
    return word;
  });

  // 4. Join and truncate prefix to max allowed length
  let prefix = shortened.join("-").toLowerCase();
  prefix = prefix.substring(0, prefixTargetLen).replace(/-+$/, "");

  return `${prefix}_${shortHash}`;
}

export type AWSEventBusConfig = {
  /**
   * The SNS client region
   */
  region: string;
  /**
   * GraphQL schema for publishing events.
   */
  publisher?: {
    schema: GraphQLSchema;
  };
  /**
   * To handle payloads that are above the max payload size for aws SQS events
   */
  s3?: {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    bucket: string;
    folder: string;
  };
  subscriber?: {
    /**
     * Queries for events being subcribed to
     */
    queries: DocumentNode;
    /**
     * GraphQL schema of events
     */
    schema: GraphQLSchema;
    cb: EventBusSubscriberCb;
    fetchMessagesOptions?: (topicName: string) => { maxMessageCount?: number };
    /**
     * Override the topics that the subscriber consumes.
     * The subscribers get event for all the topics from queries that are not included in this list
     */
    skipTopics?: string[];
    /**
     * Override the topics that the subscriber consumes.
     * The subscribers get event for only subset of topics from queries that are included in this list
     */
    includeTopics?: string[];
    /**
     * Fanout topic names
     * When publishing to a fanout topic, all the subscribers of each service get the event
     */
    fanoutTopics?: string[];
    /**
     * Maximum value: 20
     * Set to 0 for no wait
     */
    pollingTimeSeconds?: number;
    maxNumberOfMessages?: number;
    /**
     * Used to consume messages that are published for specific version of subscribers. Example: "dark", "canary"
     * To target this version of consumer, the publisher must publish message with header `x-prop-${serviceName}-version: ${version}`
     */
    version?: string;
    /**
     * Used to delete queues that were created temporarily. For instance, you can use set it to true for temporary version of your service.
     */
    deleteQueuesOnClose?: boolean;
  };
  plugins?: EventBusPlugin[];
  /**
   * Every service in your app should use a different serviceName.
   * This is used to create topics/queues are are consumed by a certain service.
   * Only one instance of a service gets an event that it is subscribed to
   */
  serviceName: string;
  /**
   * Topics and queue names are prefixed by this value. By default we use "graphql-eventbus".
   */
  topicPrefix?: string | null;
  /**
   * Deprecated. Use version field under subscriber insread.
   */
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

const TOPIC_PREFIX = "graphql-eventbus";

export class AWSEventBus {
  public snsClient: SNSClient;
  public sqsClient: SQSClient;
  public stsClient: STSClient;
  private s3Client: S3 | null = null;
  private publishTopics: { [topicName: string]: string } = {};
  private closeSignal = false;
  private awsAccountId = "";
  private deleteSubscriptionsAndQueues: {
    subscriptionArn: string;
    queueUrl: string;
  }[] = [];
  private ongoingPublishes = new Set();
  private bus: GraphQLEventbus;
  constructor(private config: AWSEventBusConfig) {
    this.snsClient = new SNSClient({
      region: config.region,
    });
    this.s3Client = config.s3
      ? new S3({
          region: config.s3.region,
          credentials:
            config.s3.accessKeyId && config.s3.secretAccessKey
              ? {
                  accessKeyId: config.s3.accessKeyId,
                  secretAccessKey: config.s3.secretAccessKey,
                }
              : undefined,
        })
      : null;
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
                try {
                  this.publishTopics[topicName] = await this.createTopic(
                    `${config.topicPrefix || TOPIC_PREFIX}-${topicName}`,
                  );
                } catch (e) {
                  console.error(`Creation of topic ${topicName} failed.`);
                  throw e;
                }
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
              if (messageSize > maxSize && this.s3Client && this.config.s3) {
                console.log("large message detected...");
                const keyPrefix = this.config.s3.folder;
                const key =
                  (keyPrefix.endsWith("/") ? keyPrefix : keyPrefix + "/") +
                  v4() +
                  ".json";
                console.log("uploading payload to ", key);
                const command = new PutObjectCommand({
                  Bucket: this.config.s3.bucket,
                  Key: key,
                  Body: message,
                });
                await this.s3Client.send(command);
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
                  `${config.topicPrefix || TOPIC_PREFIX}-${topicName}`,
                );
                const compressedTopicName = compressEventIfNeeded(topicName);
                let queueName = `${config.topicPrefix || TOPIC_PREFIX}-${
                  this.config.serviceName
                }-${compressedTopicName}${
                  this.config.isDarkRelease ? "-dark" : ""
                }`;
                if (this.config.subscriber?.version) {
                  queueName = `${config.topicPrefix || TOPIC_PREFIX}-${
                    this.config.serviceName
                  }-${compressedTopicName}-${this.config.subscriber?.version}`;
                }
                const isFanout =
                  this.config.subscriber?.fanoutTopics?.includes(topicName);
                // we use a different subscription name for each instance of the service for a fanout topic
                if (isFanout) {
                  queueName = `${config.topicPrefix || TOPIC_PREFIX}-${
                    this.config.serviceName
                  }-${compressedTopicName}-${
                    Math.random().toString().split(".")[1]
                  }${this.config.isDarkRelease ? "-dark" : ""}`;
                  if (this.config.subscriber?.version) {
                    queueName = `${config.topicPrefix || TOPIC_PREFIX}-${
                      this.config.serviceName
                    }-${compressedTopicName}-${
                      Math.random().toString().split(".")[1]
                    }-${this.config.subscriber?.version}`;
                  }
                }
                if (queueName.length > 80) {
                  console.error(
                    `Queue name ${queueName} for topic ${topicName} exceeded 80 characters. Skipping...`,
                  );
                  return;
                }
                const { queueArn, queueUrl } = await this.createQueue(
                  queueName,
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
                try {
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
                  if (
                    this.config.subscriber?.deleteQueuesOnClose &&
                    !isFanout
                  ) {
                    response.SubscriptionArn &&
                      this.deleteSubscriptionsAndQueues.push({
                        queueUrl: queueUrl,
                        subscriptionArn: response.SubscriptionArn,
                      });
                  }
                } catch (e) {
                  console.error(
                    "Subscripiton to topic and queue failed",
                    topicArn,
                    queueArn,
                  );
                  throw e;
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
    cb: (baggage: Baggage) => Promise<unknown>,
    options?: {
      MaxNumberOfMessages?: number;
    },
  ) => {
    const MaxNumberOfMessages = Math.max(
      options?.MaxNumberOfMessages ??
        this.config.subscriber?.maxNumberOfMessages ??
        10,
      0,
    );
    try {
      // in every fetch request, we wait for up to 20 seconds to retrieve at most MaxNumberOfMessages.
      // once all those messages by processed by cb, we do the next fetch.
      // Receive messages from the queue
      const receiveMessageCommand = new ReceiveMessageCommand({
        QueueUrl: queueUrl, // The URL of the SQS queue
        MaxNumberOfMessages, // Number of messages to retrieve (max is 10)
        WaitTimeSeconds: this.config.subscriber?.pollingTimeSeconds ?? 20, // Long polling (wait for messages up to 20 seconds)
        VisibilityTimeout: 30, // The time for which a message is hidden after being received
        AttributeNames: ["All"], // Optionally retrieve additional message attributes
        MessageAttributeNames: ["All"], // Optionally retrieve all message attributes
      });

      // Send the command to receive the message
      const response = await this.sqsClient.send(receiveMessageCommand);
      if (this.closeSignal) {
        return;
      }
      if (!response.Messages?.length) {
        return;
      }
      for (const message of response.Messages) {
        const messageBody = JSON.parse(message.Body || "");
        await cb(JSON.parse(messageBody.Message)).then((r) => {
          if (r instanceof Error) {
            console.log(
              "skipping deleting the message because of returned error: ",
              r.message,
            );
            return;
          }
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
    const foo = (options?: { MaxNumberOfMessages?: number }) =>
      this.receiveMessageFromQueue(
        queueUrl,
        async (baggage) => {
          if ("__s3Key" in baggage && this.config.s3 && this.s3Client) {
            const command = new GetObjectCommand({
              Bucket: this.config.s3.bucket,
              Key: baggage["__s3Key"] as string,
            });
            const response = await this.s3Client.send(command);
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
          return cb({
            topic: topicName,
            baggage: {
              metadata: baggage.metadata,
              payload: baggage.payload,
            },
          });
        },
        options,
      );
    while (!this.closeSignal) {
      const clientFetchOptions =
        this.config.subscriber?.fetchMessagesOptions?.(topicName);
      if (clientFetchOptions?.maxMessageCount === 0) {
        // if we don't wait there will be infinite sync while loop that will block the event loop
        await wait(1 * 1000);
      } else {
        await foo({
          MaxNumberOfMessages: clientFetchOptions?.maxMessageCount,
        });
      }
    }
    // this.pollTimers.push(setInterval(foo, 1000));
  };
  private createTopic = async (topicName: string): Promise<string> => {
    console.log("creating topic ", topicName);
    const topicArn = `arn:aws:sns:${this.config.region}:${this.awsAccountId}:${topicName}`;
    await this.snsClient.send(new CreateTopicCommand({ Name: topicName }));
    return topicArn;
  };
  private createQueue = async (
    queueName: string,
    topicArn: string,
  ): Promise<{
    queueUrl: string;
    queueArn: string;
  }> => {
    const queueArn = `arn:aws:sqs:${this.config.region}:${this.awsAccountId}:${queueName}`;
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
  init = async () => {
    const stsResponse = await this.stsClient.send(
      new GetCallerIdentityCommand({}),
    );
    const accountId = stsResponse.Account;
    this.awsAccountId = accountId || "";
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
