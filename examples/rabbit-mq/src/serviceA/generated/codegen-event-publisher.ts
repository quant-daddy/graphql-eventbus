export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
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

export type Query = {
  UserCreatedEvent: UserCreatedEvent;
  UserDeletedEvent: UserDeletedEvent;
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

export type UserType =
  | 'ENTERPRISE'
  | 'STARTUP';


function publish(
  data:
    | { topic: "UserCreatedEvent", payload: UserCreatedEvent }
    | { topic: "UserDeletedEvent", payload: UserDeletedEvent }
): Promise<void>;
function publish(): Promise<void>{
  return Promise.resolve();
}

export type Publish = typeof publish
