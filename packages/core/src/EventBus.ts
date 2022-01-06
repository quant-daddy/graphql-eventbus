import { DocumentNode, GraphQLSchema } from "graphql";
import { Metadata } from "./VanillaEventBus";

export type EventBusSubscriberCb = (props: {
  topic: string;
  payload: {};
  fullData: {};
  metadata: Metadata;
}) => Promise<unknown>;

export interface SubscriberConfig {
  queries: DocumentNode;
  schema: GraphQLSchema;
  cb: EventBusSubscriberCb;
}

export interface PublisherConfig {
  schema: GraphQLSchema;
}

// export interface EventBusConfig {
//   publisher?: PublisherConfig;
//   subscriber?: SubscriberConfig;
//   plugins?: EventBusPlugin[];
// }
