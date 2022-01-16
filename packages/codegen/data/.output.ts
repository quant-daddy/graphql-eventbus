// @ts-nocheck 
import { MyContext } from '../file'

function publish(
  data:
    | { topic: "CommentsDeleteEvent", payload: Drury }
    | { topic: "CommentCreateEvent", payload: CommentCreateEvent }
    | { topic: "CommentEditEvent", payload: CommentEditEvent }
    | { topic: "CommentFlagEvent", payload: CommentFlagEvent }
    | { topic: "CommentReactionEvent", payload: CommentReactionEvent }
    | { topic: "CommentReactionUndoEvent", payload: CommentReactionUndoEvent }
    | { topic: "EntityFlagEvent", payload: EntityFlagEvent }
    | { topic: "EntityReactionEvent", payload: EntityReactionEvent }
    | { topic: "EntityReactionUndoEvent", payload: EntityReactionUndoEvent }
    | { topic: "ReactionEntityDeleteEvent", payload: ReactionEntityDeleteEvent }
): Promise<void>;
function publish(): Promise<void>{
  return Promise.resolve();
}

export type Publish = typeof publish

function eventSampler(args: { topic: "CommentsDeleteEvent", override?: Partial<Drury> }): Drury
function eventSampler(args: { topic: "CommentCreateEvent", override?: Partial<CommentCreateEvent> }): CommentCreateEvent
function eventSampler(args: { topic: "CommentEditEvent", override?: Partial<CommentEditEvent> }): CommentEditEvent
function eventSampler(args: { topic: "CommentFlagEvent", override?: Partial<CommentFlagEvent> }): CommentFlagEvent
function eventSampler(args: { topic: "CommentReactionEvent", override?: Partial<CommentReactionEvent> }): CommentReactionEvent
function eventSampler(args: { topic: "CommentReactionUndoEvent", override?: Partial<CommentReactionUndoEvent> }): CommentReactionUndoEvent
function eventSampler(args: { topic: "EntityFlagEvent", override?: Partial<EntityFlagEvent> }): EntityFlagEvent
function eventSampler(args: { topic: "EntityReactionEvent", override?: Partial<EntityReactionEvent> }): EntityReactionEvent
function eventSampler(args: { topic: "EntityReactionUndoEvent", override?: Partial<EntityReactionUndoEvent> }): EntityReactionUndoEvent
function eventSampler(args: { topic: "ReactionEntityDeleteEvent", override?: Partial<ReactionEntityDeleteEvent> }): ReactionEntityDeleteEvent
;function eventSampler(): {}{
  return {};
}
export type EventSampler = typeof eventSampler


export interface EventHandlers {
  DeleteGroup: (msg: MyDeleteQuery["DeleteGroup"], ctx: MyContext) => Promise<unknown>,
  AnswerAccept: (msg: AnswerAcceptQuery["AnswerAccept"], ctx: MyContext) => Promise<unknown>,
  AnswerCreate: (msg: AnswerCreateQuery["AnswerCreate"], ctx: MyContext) => Promise<unknown>,
  AnswerEdit: (msg: AnswerEditQuery["AnswerEdit"], ctx: MyContext) => Promise<unknown>,
  QuestionCreate: (msg: QuestionCreateQuery["QuestionCreate"], ctx: MyContext) => Promise<unknown>,
  QuestionEdit: (msg: QuestionEditQuery["QuestionEdit"], ctx: MyContext) => Promise<unknown>,
  QuestionResolve: (msg: QuestionResolveQuery["QuestionResolve"], ctx: MyContext) => Promise<unknown>,
  CommentCreate: (msg: CommentCreateQuery["CommentCreate"], ctx: MyContext) => Promise<unknown>,
  CommentReaction: (msg: CommentReactionQuery["CommentReaction"], ctx: MyContext) => Promise<unknown>,
  EntityReaction: (msg: EntityReactionQuery["EntityReaction"], ctx: MyContext) => Promise<unknown>,
  AnswerAcceptUndo: (msg: AnswerAcceptUndoQuery["AnswerAcceptUndo"], ctx: MyContext) => Promise<unknown>,
  QuestionResolveUndo: (msg: QuestionResolveUndoQuery["QuestionResolveUndo"], ctx: MyContext) => Promise<unknown>,
  AnswerDelete: (msg: AnswerDeleteQuery["AnswerDelete"], ctx: MyContext) => Promise<unknown>,
  QuestionDelete: (msg: QuestionDeleteQuery["QuestionDelete"], ctx: MyContext) => Promise<unknown>,
  CommentReactionUndo: (msg: CommentReactionUndoQuery["CommentReactionUndo"], ctx: MyContext) => Promise<unknown>,
  EntityReactionUndo: (msg: EntityReactionUndoQuery["EntityReactionUndo"], ctx: MyContext) => Promise<unknown>,
  CommentsDelete: (msg: CommentsDeleteQuery["CommentsDelete"], ctx: MyContext) => Promise<unknown>,
  ReactionEntityDelete: (msg: ReactionEntityDeleteQuery["ReactionEntityDelete"], ctx: MyContext) => Promise<unknown>
}
export enum Events {
  DeleteGroup = "DeleteGroup",
  AnswerAccept = "AnswerAccept",
  AnswerCreate = "AnswerCreate",
  AnswerEdit = "AnswerEdit",
  QuestionCreate = "QuestionCreate",
  QuestionEdit = "QuestionEdit",
  QuestionResolve = "QuestionResolve",
  CommentCreate = "CommentCreate",
  CommentReaction = "CommentReaction",
  EntityReaction = "EntityReaction",
  AnswerAcceptUndo = "AnswerAcceptUndo",
  QuestionResolveUndo = "QuestionResolveUndo",
  AnswerDelete = "AnswerDelete",
  QuestionDelete = "QuestionDelete",
  CommentReactionUndo = "CommentReactionUndo",
  EntityReactionUndo = "EntityReactionUndo",
  CommentsDelete = "CommentsDelete",
  ReactionEntityDelete = "ReactionEntityDelete",
}