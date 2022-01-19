import { DocumentNode, GraphQLError, GraphQLSchema } from "graphql";
import { Validator } from "./validator";
import {
  getRootQueryFields,
  getTopicsFromDocument,
  validateQuery,
} from "./eventbus-utils";

export class InvalidPublishTopic extends Error {
  constructor(...params: any[]) {
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
    await validateQuery(this.publisherSchema, queries);
    this.consumerTopics = getTopicsFromDocument(queries);
    return Object.keys(this.consumerTopics);
  };

  extractData = async (args: {
    topic: string;
    data: {};
  }): Promise<{
    data: {} | null;
    errors?: readonly GraphQLError[];
    deprecated?: readonly GraphQLError[];
  }> => {
    const queriedData = await this.validator.extract(
      this.consumerTopics[args.topic],
      args.topic,
      args.data,
    );
    return {
      data: queriedData.payload.data?.[args.topic] || null,
      errors: queriedData.errors,
      deprecated: queriedData.deprecated,
    };
  };

  publishValidate = async (props: { topic: string; payload: {} }) => {
    if (!this.validator || !this.publishTopicNames) {
      throw new Error("You must specify publishSchema in the constructor");
    }
    if (this.publishTopicNames.indexOf(props.topic) === -1) {
      throw new InvalidPublishTopic(
        `Publish topic ${props.topic} has not been defined in the publishSchema ${this.publishTopicNames}`,
      );
    }
    this.validator.validate(props.topic, props.payload);
  };
}
