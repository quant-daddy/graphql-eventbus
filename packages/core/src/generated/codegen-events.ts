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
  DateTime: any;
  EmailAddress: any;
  UUID: any;
};

export type B = {
  __typename?: 'B';
  id: Scalars['UUID'];
  name: Scalars['String'];
  status: ClosedGroupJoinRequestResponseStatus;
  timestamp: Scalars['DateTime'];
};

export type C = {
  __typename?: 'C';
  boo: Scalars['String'];
  id: Scalars['UUID'];
  name: Nested;
  timestamp: Scalars['DateTime'];
};

export type ClosedGroupJoinRequestResponseEvent = {
  __typename?: 'ClosedGroupJoinRequestResponseEvent';
  groupId: Scalars['String'];
  id: Scalars['UUID'];
  requestId: Scalars['String'];
  requestedByUserId: Scalars['String'];
  /** @deprecated Figure out something else bro */
  status: ClosedGroupJoinRequestResponseStatus;
  timestamp: Scalars['DateTime'];
};

export enum ClosedGroupJoinRequestResponseStatus {
  Accepted = 'ACCEPTED',
  Rejected = 'REJECTED'
}

export type Complex = {
  __typename?: 'Complex';
  /** @deprecated Do not use this */
  groupId: Scalars['String'];
  id: Scalars['UUID'];
  nested: Maybe<Nested>;
  status: ClosedGroupJoinRequestResponseStatus;
  timestamp: Scalars['DateTime'];
};

export type EntityFlagEvent = {
  __typename?: 'EntityFlagEvent';
  entityId: Scalars['UUID'];
  entityOwnerId: Scalars['UUID'];
  entityType: Maybe<ReactionEntityType>;
  flaggedByUserId: Scalars['UUID'];
  groupId: Scalars['UUID'];
  id: Scalars['UUID'];
  timestamp: Scalars['DateTime'];
};

export type Nested = {
  __typename?: 'Nested';
  a: Maybe<Scalars['Boolean']>;
};

export type Query = {
  __typename?: 'Query';
  B: B;
  C: C;
  ClosedGroupJoinRequestResponseEvent: ClosedGroupJoinRequestResponseEvent;
  Complex: Complex;
  EntityFlagEvent: EntityFlagEvent;
  SignUpEvent: SignUpEvent;
};

export enum ReactionEntityType {
  Answer = 'ANSWER',
  Question = 'QUESTION'
}

export type SignUpEvent = {
  __typename?: 'SignUpEvent';
  id: Scalars['UUID'];
  timestamp: Scalars['DateTime'];
  userId: Scalars['String'];
};
