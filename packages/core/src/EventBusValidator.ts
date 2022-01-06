// import { metrics } from "./eventbusMetrics";
import { DocumentNode, GraphQLSchema, printSchema } from "graphql";
import { Validator } from "./validator";
import {
  getRootQueryFields,
  getTopicsFromDocument,
  validateQueries,
} from "./eventbus-utils";

// interface Metrics {
//   consume: (topicName: string) => any;
//   consumeStart: (topicName: string) => () => any;
//   consumeError: (topicName: string) => any;
//   publish: (topicName: string) => any;
//   publishError: (topicName: string) => any;
// }

export class InvalidPublishTopic extends Error {
  constructor(...params: any[]) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(...params);
  }
}

/**
 *
 * Eventbus Class
 * @class EventBus
 *
 * @param {GraphQLSchema} publishSchema The GraphQL schema of message publisher to validated the published messaged agains
 */
export class EventBusValidator {
  private publisherSchema!: GraphQLSchema;
  private consumerTopics!: { [key: string]: DocumentNode };
  private validator: Validator;
  private publishTopicNames?: string[];
  constructor(props: { publisherSchema: GraphQLSchema }) {
    this.publisherSchema = props.publisherSchema;
    this.validator = new Validator(this.publisherSchema);
    this.publishTopicNames = getRootQueryFields(this.publisherSchema);
  }

  getDocumentForTopic = (topic: string) => {
    return this.consumerTopics[topic];
  };

  validateConsumerQueries = async (queries: DocumentNode) => {
    try {
      await validateQueries(this.publisherSchema, [queries]);
      this.consumerTopics = getTopicsFromDocument(queries);
      return Object.keys(this.consumerTopics);
    } catch (e) {
      const graphqlSchemaObj = printSchema(this.publisherSchema);
      console.info(`Using schema`, graphqlSchemaObj);
      throw e;
    }
  };

  extractData = async (args: { topic: string; data: {} }) => {
    const queriedData = await this.validator.extract(
      this.consumerTopics[args.topic],
      args.topic,
      args.data
    );
    if (queriedData.errors) {
      throw new Error(JSON.stringify(queriedData.errors, null, 2));
    }
    if (!queriedData.data) {
      throw new Error("Queried data is null");
    }
    return queriedData.data[args.topic];
  };

  publishValidate = async (props: { topic: string; payload: {} }) => {
    if (!this.validator || !this.publishTopicNames) {
      throw new Error(
        "You must specify publishSchema in the constructor"
      );
    }
    if (this.publishTopicNames.indexOf(props.topic) === -1) {
      throw new InvalidPublishTopic(
        `Publish topic ${props.topic} has not been defined in the publishSchema ${this.publishTopicNames}`
      );
    }
    this.validator.validate(props.topic, props.payload);
  };
}
