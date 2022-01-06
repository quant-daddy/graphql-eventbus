export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
import { MessageHandlerContext } from '../WebhookBus'

function publish(
  data:
    | { event: "EventA", payload: EventA }
    | { event: "EventB", payload: EventB }
): Promise<void>;
function publish(): Promise<void>{
  return Promise.resolve();
}

export type Publish = typeof publish

function eventSampler(args: { event: "EventA", override?: Partial<EventA> }): EventA
function eventSampler(args: { event: "EventB", override?: Partial<EventB> }): EventB
;function eventSampler(): {}{
  return {};
}
export type EventSampler = typeof eventSampler


export interface EventHandlers {
  EventA: (msg: EventAQuery["EventA"], ctx: MessageHandlerContext) => Promise<any>,
  EventB: (msg: EventBQuery["EventB"], ctx: MessageHandlerContext) => Promise<any>
}
export enum Events {
  EventA = "EventA",
  EventB = "EventB",
}
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
};

export type EventA = {
  id: Scalars['ID'];
  name: Maybe<Scalars['String']>;
};

export type EventB = {
  color: Maybe<Scalars['String']>;
  id: Scalars['ID'];
};

export type Query = {
  EventA: EventA;
  EventB: EventB;
};

export type EventAQueryVariables = Exact<{ [key: string]: never; }>;


export type EventAQuery = { EventA: { id: string, name: string | null | undefined } };

export type EventBQueryVariables = Exact<{ [key: string]: never; }>;


export type EventBQuery = { EventB: { id: string, color: string | null | undefined } };
