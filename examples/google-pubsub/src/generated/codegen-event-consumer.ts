export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
import { MessageHandlerContext } from "../types";

function eventSampler(args: {
  event: "UserCreatedEvent";
  override?: Partial<UserCreatedEvent>;
}): UserCreatedEvent;
function eventSampler(args: {
  event: "UserDeletedEvent";
  override?: Partial<UserDeletedEvent>;
}): UserDeletedEvent;
function eventSampler(): {} {
  return {};
}
export type EventSampler = typeof eventSampler;

export interface EventHandlers {
  UserCreatedEvent: (
    msg: UserCreatedEventQuery["UserCreatedEvent"],
    ctx: MessageHandlerContext
  ) => Promise<any>;
  UserDeletedEvent: (
    msg: UserDeletedEventQuery["UserDeletedEvent"],
    ctx: MessageHandlerContext
  ) => Promise<any>;
}
export enum Events {
  UserCreatedEvent = "UserCreatedEvent",
  UserDeletedEvent = "UserDeletedEvent",
}
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  DateTime: string;
  UUID: string;
};

export type Query = {
  UserCreatedEvent: UserCreatedEvent;
  UserDeletedEvent: UserDeletedEvent;
};

export type UserCreatedEvent = {
  createdAt: Scalars["DateTime"];
  eventId: Scalars["UUID"];
  userEmail: Maybe<Scalars["String"]>;
  userId: Scalars["ID"];
  userName: Maybe<Scalars["String"]>;
  userType: UserType;
};

export type UserDeletedEvent = {
  deletedAt: Scalars["DateTime"];
  eventId: Scalars["UUID"];
  userId: Scalars["ID"];
};

export enum UserType {
  Enterprise = "ENTERPRISE",
  Startup = "STARTUP",
}

export type UserCreatedEventQueryVariables = Exact<{
  [key: string]: never;
}>;

export type UserCreatedEventQuery = {
  UserCreatedEvent: {
    userId: string;
    createdAt: string;
    userEmail: string | null | undefined;
    userType: UserType;
  };
};

export type UserDeletedEventQueryVariables = Exact<{
  [key: string]: never;
}>;

export type UserDeletedEventQuery = {
  UserDeletedEvent: {
    eventId: any;
    deletedAt: string;
    userId: string;
  };
};
