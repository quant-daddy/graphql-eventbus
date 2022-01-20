export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
import { MessageHandlerContext } from '../bus'

function eventSampler(args: { topic: "EmailOpenEvent", override?: Partial<EmailOpenEvent> }): EmailOpenEvent
function eventSampler(args: { topic: "SendEmailEvent", override?: Partial<SendEmailEvent> }): SendEmailEvent
function eventSampler(args: { topic: "UserCreatedEvent", override?: Partial<UserCreatedEvent> }): UserCreatedEvent
function eventSampler(args: { topic: "UserDeletedEvent", override?: Partial<UserDeletedEvent> }): UserDeletedEvent
;function eventSampler(): {}{
  return {};
}
export type EventSampler = typeof eventSampler


export interface EventHandlers {
  UserCreatedEvent: (msg: UserCreatedEventQuery["UserCreatedEvent"], ctx: MessageHandlerContext) => Promise<unknown>,
  EmailOpenEvent: (msg: EmailOpenEventQuery["EmailOpenEvent"], ctx: MessageHandlerContext) => Promise<unknown>
}
export enum Events {
  UserCreatedEvent = "UserCreatedEvent",
  EmailOpenEvent = "EmailOpenEvent",
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

export type Query = {
  EmailOpenEvent: EmailOpenEvent;
  SendEmailEvent: SendEmailEvent;
  UserCreatedEvent: UserCreatedEvent;
  UserDeletedEvent: UserDeletedEvent;
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

export type UserDeletedEvent = {
  eventId: Scalars['UUID'];
  userId: Scalars['ID'];
};

export enum UserType {
  Enterprise = 'ENTERPRISE',
  Startup = 'STARTUP'
}

export type UserCreatedEventQueryVariables = Exact<{ [key: string]: never; }>;


export type UserCreatedEventQuery = { UserCreatedEvent: { userEmail: string | null | undefined, userType: UserType, userName: string | null | undefined } };

export type EmailOpenEventQueryVariables = Exact<{ [key: string]: never; }>;


export type EmailOpenEventQuery = { EmailOpenEvent: { __typename: 'EmailOpenEvent' } };
