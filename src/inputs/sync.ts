import { ArgsType, ClassType, Field, ID, InputType, ObjectType } from 'type-graphql';

import { MessageType } from '!/entities/Message';
import Room from '!/entities/Room';

///////////////////////////
// Sync input and result //
///////////////////////////
function SyncTableChangeSet<TItem>(TItemClass: ClassType<TItem>) {
  @InputType('SyncTableChangeSetInput', { isAbstract: true })
  @ObjectType('SyncTableChangeSet', { isAbstract: true })
  abstract class SyncTableChangeSetClass {
    @Field(() => [TItemClass])
    created?: TItem[];

    @Field(() => [TItemClass])
    updated?: TItem[];

    @Field(() => [ID])
    deleted?: string[];
  }
  return SyncTableChangeSetClass;
}

@InputType('DatabaseKeysInput')
@ObjectType('DatabaseKeys')
export class DatabaseKeys {
  @Field()
  _status?: string;

  @Field()
  _changed?: string;
}

@InputType('UserChangesInput')
@ObjectType('UserChanges')
export class UserChanges extends DatabaseKeys {
  @Field(() => ID)
  id?: string;

  @Field()
  name?: string;

  @Field()
  email?: string;

  @Field()
  pictureUri?: string;

  @Field()
  publicKey?: string;

  @Field()
  derivedSalt?: string;

  @Field()
  role?: string;

  @Field(() => Boolean)
  isFollowingMe?: boolean | null;

  @Field(() => Boolean)
  isFollowedByMe?: boolean | null;
}

@InputType('RoomChangesInput')
@ObjectType('RoomChanges')
export class RoomChanges extends DatabaseKeys {
  @Field(() => ID)
  id?: string;

  @Field()
  name?: string;

  @Field()
  pictureUri?: string;

  @Field()
  isMuted: boolean;

  @Field()
  shouldStillNotify: boolean;

  @Field()
  mutedUntil?: number;

  @Field()
  lastReadAt?: number;

  @Field()
  lastChangeAt?: number;

  @Field(() => ID)
  lastMessageId?: string;

  @Field()
  createdAt?: number;
}

@InputType('RoomMemberChangesInput')
@ObjectType('RoomMemberChanges')
export class RoomMemberChanges extends DatabaseKeys {
  @Field(() => String, { description: 'Not a normal uuid' })
  id?: string;

  @Field(() => ID)
  roomId?: string;

  @Field(() => ID)
  userId?: string;
}

@InputType('MessageChangesInput')
@ObjectType('MessageChanges')
export class MessageChanges extends DatabaseKeys {
  @Field(() => ID)
  id?: string;

  @Field()
  cipher?: string;

  @Field(() => MessageType)
  type?: MessageType;

  @Field(() => ID)
  userId?: string;

  @Field(() => ID)
  roomId?: string;

  @Field()
  sentAt?: number;

  @Field()
  createdAt?: number;
}

@InputType('AttachmentChangesInput')
@ObjectType('AttachmentChanges')
export class AttachmentChanges extends DatabaseKeys {
  @Field(() => ID)
  id?: string;

  @Field()
  cipherUri?: string;

  @Field()
  filename?: string;

  @Field()
  type?: string;

  @Field()
  width?: number;

  @Field()
  height?: number;

  @Field(() => ID)
  userId?: string;

  @Field(() => ID)
  roomId?: string;

  @Field(() => ID)
  messageId?: string;

  // @Field(() => ID)
  // postId?: string;
}

@InputType('ReadReceiptChangesInput')
@ObjectType('ReadReceiptChanges')
export class ReadReceiptChanges extends DatabaseKeys {
  @Field(() => ID)
  id?: string;

  @Field(() => ID)
  userId?: string;

  @Field(() => ID)
  roomId?: string;

  @Field(() => ID)
  messageId?: string;

  @Field()
  receivedAt?: number;

  @Field()
  seenAt?: number;
}

@InputType('UserTableChangeSetInput')
@ObjectType('UserTableChangeSet')
export class UserTableChangeSet extends SyncTableChangeSet(UserChanges) {}

@InputType('RoomTableChangeSetInput')
@ObjectType('RoomTableChangeSet')
export class RoomTableChangeSet extends SyncTableChangeSet(RoomChanges) {}

@InputType('RoomMemberTableChangeSetInput')
@ObjectType('RoomMemberTableChangeSet')
export class RoomMemberTableChangeSet extends SyncTableChangeSet(RoomMemberChanges) {}

@InputType('MessageTableChangeSetInput')
@ObjectType('MessageTableChangeSet')
export class MessageTableChangeSet extends SyncTableChangeSet(MessageChanges) {}

@InputType('AttachmentTableChangeSetInput')
@ObjectType('AttachmentTableChangeSet')
export class AttachmentTableChangeSet extends SyncTableChangeSet(AttachmentChanges) {}

@InputType('ReadReceiptTableChangeSetInput')
@ObjectType('ReadReceiptTableChangeSet')
export class ReadReceiptTableChangeSet extends SyncTableChangeSet(ReadReceiptChanges) {}

@InputType('SyncChangesInput')
@ObjectType('SyncChanges')
export class SyncChanges {
  @Field(() => MessageTableChangeSet)
  messages: MessageTableChangeSet;

  @Field(() => AttachmentTableChangeSet)
  attachments?: AttachmentTableChangeSet;

  @Field(() => ReadReceiptTableChangeSet)
  readReceipts?: ReadReceiptTableChangeSet;

  @Field(() => RoomTableChangeSet)
  rooms?: RoomTableChangeSet;

  @Field(() => UserTableChangeSet)
  users?: UserTableChangeSet;

  @Field(() => RoomMemberTableChangeSet)
  roomMembers?: RoomMemberTableChangeSet;
}

//////////
// Pull //
//////////
@ArgsType()
export class PullChangesArgs {
  @Field({ description: 'Last time client pulled changes in milliseconds since UNIX epoch' })
  lastPulledAt?: number;
}

@ObjectType()
export class PullChangesResult {
  @Field({ description: 'Last successful pull in milliseconds since UNIX epoch', nullable: false })
  timestamp: number;

  @Field(() => SyncChanges)
  changes: SyncChanges;
}

//////////
// Push //
//////////
@ArgsType()
export class PushChangesArgs {
  @Field({ description: 'Last time client pulled changes in milliseconds since UNIX epoch' })
  lastPulledAt: number;

  @Field(() => SyncChanges)
  changes: SyncChanges;
}

/////////////////
// Should Sync //
/////////////////
@ArgsType()
export class ShouldSyncArgs {
  @Field(() => [ID])
  roomIds: string[];
}

export interface ShouldSyncPayload {
  publisherId: string;
  rooms: Room[];
}
