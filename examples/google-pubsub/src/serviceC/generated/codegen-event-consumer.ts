export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
import { MessageHandlerContext } from '../bus'

function eventSampler(args: { event: "EmailOpenEvent", override?: Partial<EmailOpenEvent> }): EmailOpenEvent
function eventSampler(args: { event: "NoConsumerEvent", override?: Partial<NoConsumerEvent> }): NoConsumerEvent
function eventSampler(args: { event: "SendEmailEvent", override?: Partial<SendEmailEvent> }): SendEmailEvent
function eventSampler(args: { event: "UserCreatedEvent", override?: Partial<UserCreatedEvent> }): UserCreatedEvent
;function eventSampler(): {}{
  return {};
}
export type EventSampler = typeof eventSampler


export interface EventHandlers {
  SendEmailEvent: (msg: SendEmailEventQuery["SendEmailEvent"], ctx: MessageHandlerContext) => Promise<any>
}
export enum Events {
  SendEmailEvent = "SendEmailEvent",
}
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  DateTime: string;
  EmailAddress: string;
  UUID: string;
};

export type EmailOpenEvent = {
  emailAddress: Scalars['EmailAddress'];
  eventId: Scalars['UUID'];
  openedAt: Scalars['DateTime'];
};

export type NoConsumerEvent = {
  eventId: Scalars['UUID'];
};

export type Query = {
  EmailOpenEvent: EmailOpenEvent;
  NoConsumerEvent: NoConsumerEvent;
  SendEmailEvent: SendEmailEvent;
  UserCreatedEvent: UserCreatedEvent;
};

export type SendEmailEvent = {
  content: Scalars['String'];
  emailAddress: Scalars['EmailAddress'];
  eventId: Scalars['UUID'];
};

export type UserCreatedEvent = {
  createdAt: Scalars['DateTime'];
  eventId: Scalars['UUID'];
  userEmail: Maybe<Scalars['EmailAddress']>;
  userId: Scalars['ID'];
  userName: Maybe<Scalars['String']>;
  userType: UserType;
};

export enum UserType {
  Enterprise = 'ENTERPRISE',
  Startup = 'STARTUP'
}

export type SendEmailEventQueryVariables = Exact<{ [key: string]: never; }>;


export type SendEmailEventQuery = { SendEmailEvent: { content: string, emailAddress: string } };
