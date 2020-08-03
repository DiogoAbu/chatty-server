import {
  Args,
  Authorized,
  Ctx,
  Mutation,
  Publisher,
  PubSub,
  Query,
  Resolver,
  ResolverFilterData,
  Root,
  Subscription,
} from 'type-graphql';

import Attachment from '!/entities/Attachment';
import Message, { MessageType } from '!/entities/Message';
import ReadReceipt from '!/entities/ReadReceipt';
import Room from '!/entities/Room';
import RoomPreferences from '!/entities/RoomPreferences';
import User from '!/entities/User';
import {
  AttachmentChanges,
  MessageChanges,
  PullChangesArgs,
  PullChangesResult,
  PushChangesArgs,
  ReadReceiptChanges,
  RoomChanges,
  RoomMemberChanges,
  RoomMemberTableChangeSet,
  ShouldSyncArgs,
  ShouldSyncPayload,
  UserChanges,
} from '!/inputs/sync';
import debug from '!/services/debug';
import { sendPush } from '!/services/push-notifications';
import { CustomContext } from '!/types';
import getChanges from '!/utils/get-changes';

import { SHOULD_SYNC } from './subs-types';

const log = debug.extend('sync');

const SEPARATOR = ',';

@Resolver()
export class SyncResolver {
  @Authorized()
  @Query(() => PullChangesResult)
  async pullChanges(@Ctx() ctx: CustomContext, @Args() data: PullChangesArgs): Promise<PullChangesResult> {
    // Signed in user
    const userId = ctx.userId!;

    const { lastPulledAt } = data;

    const lastPulledDate = lastPulledAt ? new Date(lastPulledAt) : new Date(1969, 0);

    log('Sending changes after %s (%s)', lastPulledDate, lastPulledAt);

    const result: PullChangesResult = {
      changes: {
        users: {
          created: [],
          updated: [],
          deleted: [],
        },
        rooms: {
          created: [],
          updated: [],
          deleted: [],
        },
        messages: {
          created: [],
          updated: [],
          deleted: [],
        },
        readReceipts: {
          created: [],
          updated: [],
          deleted: [],
        },
        attachments: {
          created: [],
          updated: [],
          deleted: [],
        },
        roomMembers: {
          created: [],
          updated: [],
          deleted: [],
        },
      },
      timestamp: 0,
    };

    // Get changes for signed user
    const user = await User.createQueryBuilder('user')
      .leftJoinAndSelect('user.rooms', 'room')
      .leftJoinAndSelect('user.roomPreferences', 'roomPreferences')
      .leftJoinAndSelect('roomPreferences.room', 'roomPreferencesRoom')
      .leftJoinAndSelect('room.members', 'member')
      .leftJoinAndSelect('room.messages', 'message')
      .leftJoinAndSelect('message.sender', 'messageSender')
      .leftJoinAndSelect('message.attachments', 'messageAttachment')
      .leftJoinAndSelect('messageAttachment.user', 'messageAttachmentUser')
      .leftJoinAndSelect('message.readReceipts', 'readReceipt', 'readReceipt.updatedAt > :lastPulledDate', {
        lastPulledDate,
      })
      .leftJoinAndSelect('readReceipt.user', 'readReceiptUser')
      .leftJoinAndSelect('user.followers', 'follower')
      .leftJoinAndSelect('member.followers', 'memberFollower')
      .where('user.id = :userId AND user.isDeleted = false', { userId })
      .orderBy({
        'message.createdAt': 'DESC',
      })
      .getOne();

    // Check for rooms
    if (user?.rooms.length) {
      const messages: MessageChanges[] = [];
      const attachments: AttachmentChanges[] = [];
      const readReceipts: ReadReceiptChanges[] = [];
      const rooms: RoomChanges[] = [];

      const users = new Map<string, UserChanges>();
      const roomMembers = new Map<string, RoomMemberChanges>();

      user.rooms.map((room) => {
        // Get users and room members
        room.members.map((member) => {
          if (member.updatedAt > lastPulledDate) {
            const { id, name, email, pictureUri, role, publicKey, followers } = member;

            // Add user
            users.set(id, {
              id,
              name,
              email,
              pictureUri,
              publicKey,
              role,
              isFollowingMe: id === user.id ? null : user.followers.some((e) => e.id === id),
              isFollowedByMe: id === user.id ? null : followers.some((e) => e.id === user.id),
            });
          }

          if (room.updatedAt > lastPulledDate) {
            const id = room.id + SEPARATOR + member.id;

            // Add member
            roomMembers.set(id, {
              id,
              roomId: room.id,
              userId: member.id,
            });
          }
        });

        // Get last message of the room
        let lastMessageId: string | undefined;
        let lastChangeAt = room.createdAt.getTime();

        // Get time of the last message the user read
        let lastReadAt: number | undefined;

        // Get messages
        room.messages.map((msg) => {
          readReceipts.push(
            ...msg.readReceipts.map<ReadReceiptChanges>((receipt) => {
              return {
                id: receipt.id,
                userId: receipt.user.id,
                roomId: room.id,
                messageId: msg.id,
                receivedAt: receipt.receivedAt?.getTime(),
                seenAt: receipt.seenAt?.getTime(),
              };
            }),
          );

          // Get last message of the room
          const createdAt = msg.createdAt.getTime();
          if (msg.type !== MessageType.sharedKey) {
            if (!lastMessageId || !lastChangeAt || createdAt > lastChangeAt) {
              lastMessageId = msg.id;
              lastChangeAt = createdAt;
            }

            // Get last message the user read
            const seenAt = msg.readReceipts.find((e) => e.user.id === userId)?.seenAt?.getTime() ?? 0;
            if (!lastReadAt || seenAt > lastReadAt) {
              lastReadAt = seenAt;
            }
          }

          if (msg.updatedAt > lastPulledDate) {
            messages.push({
              id: msg.id,
              cipher: msg.cipher,
              type: msg.type,
              userId: msg.sender.id,
              roomId: room.id,
              sentAt: msg.sentAt.getTime(),
              createdAt,
            });

            attachments.push(
              ...msg.attachments.map<AttachmentChanges>((attachment) => {
                return {
                  id: attachment.id,
                  cipherUri: attachment.cipherUri,
                  filename: attachment.filename,
                  type: attachment.type,
                  width: attachment.width,
                  height: attachment.height,
                  userId: attachment.user.id,
                  messageId: msg.id,
                  roomId: room.id,
                };
              }),
            );

            users.set(msg.sender.id, {
              id: msg.sender.id,
              name: msg.sender.name,
              email: msg.sender.email,
              pictureUri: msg.sender.pictureUri,
              publicKey: msg.sender.publicKey,
              role: msg.sender.role,
            });
          }
        });

        const { id, name, pictureUri } = room;

        let isMuted = false;
        let shouldStillNotify = false;
        let mutedUntil;

        const pref = user?.roomPreferences.find((e) => e.room.id === room.id);
        if (pref) {
          isMuted = pref.isMuted;
          shouldStillNotify = pref.shouldStillNotify;
          mutedUntil = pref.mutedUntil?.getTime();
        }

        if (room.updatedAt > lastPulledDate || messages.some((e) => e.roomId === room.id)) {
          // Get rooms
          rooms.push({
            id,
            name,
            pictureUri,
            isMuted,
            shouldStillNotify,
            mutedUntil,
            lastReadAt,
            lastChangeAt,
            lastMessageId,
            createdAt: room.createdAt.getTime(),
          });
        }
      });

      result.changes.users = getChanges([...users.values()]);
      result.changes.rooms = getChanges(rooms);
      result.changes.messages = getChanges(messages);
      result.changes.readReceipts = getChanges(readReceipts);
      result.changes.attachments = getChanges(attachments);
      result.changes.roomMembers = getChanges([...roomMembers.values()]);
    }

    // Get current timestamp
    result.timestamp = Date.now();

    return result;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async pushChanges(
    @Ctx() ctx: CustomContext,
    @Args() data: PushChangesArgs,
    @PubSub(SHOULD_SYNC) publish: Publisher<ShouldSyncPayload>,
  ): Promise<boolean> {
    // Signed in user
    const userId = ctx.userId!;

    const { changes, lastPulledAt } = data;
    const lastPulledDate = new Date(lastPulledAt);

    const roomsToPublish = new Map<string, Room>();

    const messagesToNotify = new Map<
      string,
      {
        title: string;
        message: Message;
        roomWithMembersAndDevices: Room;
      }
    >();

    log('Receiving changes for %s (%s)', lastPulledDate, lastPulledAt);

    ///////////
    // Users //
    ///////////
    if (changes.users) {
      const { created = [], updated = [] } = changes.users;

      // Only allow self
      const userCreated = created.find(({ id }) => id === userId);
      const userFound = userCreated ?? updated.find(({ id }) => id === userId);

      if (userFound) {
        await User.update(userId, {
          name: userFound.name,
          email: userFound.email,
          pictureUri: userFound.pictureUri,
          publicKey: userFound.publicKey,
          derivedSalt: userFound.derivedSalt,
        });
      }
    }

    ///////////
    // Rooms //
    ///////////
    if (changes.rooms) {
      const { created = [], updated = [], deleted = [] } = changes.rooms;
      const asyncFuncs: Promise<any>[] = [];

      const user = await User.findOne({
        where: { id: userId, isDeleted: false },
        relations: ['rooms', 'rooms.members'],
      });

      if (user) {
        asyncFuncs.push(
          ...[...created, ...updated].map(
            async ({ id, name, pictureUri, isMuted, shouldStillNotify, mutedUntil }) => {
              if (
                !isMemberOfRoom(user.rooms, id!, userId) &&
                !isMemberOfNewRoom(changes.roomMembers, id!, userId)
              ) {
                return null;
              }

              const room = await Room.create({
                id,
                name,
                pictureUri,
              }).save();

              const prefFound = await RoomPreferences.findOne({
                where: { user: { id: userId }, room: { id: room.id } },
              });

              await RoomPreferences.create({
                id: prefFound?.id,
                isMuted,
                shouldStillNotify,
                mutedUntil: mutedUntil ? new Date(mutedUntil) : null,
                user: { id: userId },
                room,
              }).save();

              roomsToPublish.set(room.id, room);

              return room;
            },
          ),
        );

        asyncFuncs.push(
          ...deleted.map(async (id) => {
            if (!isMemberOfRoom(user.rooms, id, userId)) {
              return null;
            }
            return Room.update(id, {
              isDeleted: true,
            });
          }),
        );
      }

      await Promise.all(
        asyncFuncs.map(async (p) =>
          p.catch((err) => {
            console.log(err);
            return null;
          }),
        ),
      );
    }

    //////////////////
    // Room Members //
    //////////////////
    if (changes.roomMembers) {
      const { created = [], updated = [], deleted = [] } = changes.roomMembers;

      const uniqueRoomIdWithUsers = new Map<string, User[]>();

      const roomIdWithUsers = await Promise.all(
        [...created, ...updated].map(async (roomMember) => {
          const user = await User.findOne({ where: { id: roomMember.userId, isDeleted: false } });
          if (!user) {
            log('Failed to add member, member does not exist');
            return null;
          }
          return { roomId: roomMember.roomId!, user };
        }),
      );

      roomIdWithUsers.map((each) => {
        if (each) {
          const prev = uniqueRoomIdWithUsers.get(each.roomId) || [];
          uniqueRoomIdWithUsers.set(each.roomId, [...prev, each.user]);
        }
      });

      for (const roomId of uniqueRoomIdWithUsers.keys()) {
        const users = uniqueRoomIdWithUsers.get(roomId);
        if (!users?.length) {
          continue;
        }

        const roomFound = await Room.findOne({
          where: { id: roomId, isDeleted: false },
          relations: ['members'],
        });
        if (!roomFound) {
          log('Failed to add member, room not found');
          continue;
        }

        const newMembers = users.filter((user) => !roomFound.members.some((member) => member.id === user.id));
        roomFound.members.push(...newMembers);

        const room = await roomFound.save();
        roomsToPublish.set(room.id, room);
      }

      // Deleted
      const uniqueRoomIdWithFormerUsers = new Map<string, string[]>();

      deleted.map((id) => {
        const [roomId, memberId] = id.split(SEPARATOR);
        const prev = uniqueRoomIdWithFormerUsers.get(roomId) || [];
        uniqueRoomIdWithFormerUsers.set(roomId, [...prev, memberId]);
      });

      for (const roomId of uniqueRoomIdWithFormerUsers.keys()) {
        const formerUserIds = uniqueRoomIdWithFormerUsers.get(roomId);
        if (!formerUserIds?.length) {
          continue;
        }

        const roomFound = await Room.findOne({
          where: { id: roomId, isDeleted: false },
          relations: ['members'],
        });
        if (!roomFound) {
          log('Failed to remove member, room not found');
          continue;
        }

        roomFound.members = roomFound.members.filter((e) => !formerUserIds.includes(e.id));

        const room = await roomFound.save();
        roomsToPublish.set(room.id, room);
      }
    }

    //////////////
    // Messages //
    //////////////
    if (changes.messages) {
      const { created = [], updated = [], deleted = [] } = changes.messages;
      const asyncFuncs: Promise<any>[] = [];

      asyncFuncs.push(
        ...[...created, ...updated].map(
          async ({ id, cipher, type, userId: senderId, roomId, sentAt, createdAt }) => {
            // Can only add message for itself
            if (senderId !== userId) {
              log('Failed to add message, sent by another user');
              return null;
            }

            const sender = await User.findOne({
              where: { id: userId, isDeleted: false },
            });
            if (!sender) {
              return null;
            }

            // Get room by id
            const roomFound = await Room.findOne({
              where: { id: roomId, isDeleted: false },
              relations: ['members', 'members.devices'],
            });
            if (!roomFound) {
              return null;
            }

            // Check if user belongs to the room
            if (
              !roomFound.members.some((e) => e.id === sender.id) &&
              !isMemberOfNewRoom(changes.roomMembers, roomFound.id, sender.id)
            ) {
              log('Failed to add message, not a room member');
              return null;
            }

            const message = await Message.create({
              id: id ?? undefined,
              cipher,
              type: type ?? MessageType.default,
              sender,
              room: roomFound,
              sentAt: sentAt ? new Date(sentAt) : undefined,
              createdAt: createdAt ? new Date(createdAt) : undefined,
              updatedAt: createdAt ? new Date(createdAt) : undefined,
            }).save();

            roomsToPublish.set(roomFound.id, roomFound);

            messagesToNotify.set(message.id, {
              title: (roomFound.name || sender.name)!,
              message,
              roomWithMembersAndDevices: roomFound,
            });

            return message;
          },
        ),
      );

      asyncFuncs.push(
        ...deleted.map(async (id) => {
          return Message.update(
            { id, sender: { id: userId } },
            {
              isDeleted: true,
            },
          );
        }),
      );

      await Promise.all(
        asyncFuncs.map(async (p) =>
          p.catch((err) => {
            console.log(err);
            return null;
          }),
        ),
      );
    }

    ///////////////////
    // Read Receipts //
    ///////////////////
    if (changes.readReceipts) {
      const { created = [], updated = [] } = changes.readReceipts;
      const asyncFuncs: Promise<any>[] = [];

      const handleReadReceipts = async ({
        id,
        userId: receiptUserId,
        messageId,
        roomId,
        receivedAt,
        seenAt,
      }: any) => {
        // Can only add read receipt for itself
        if (receiptUserId !== userId) {
          log('Receipt not for signed user');
          return null;
        }

        // Get room by id
        const roomFound = await Room.findOne({
          where: { id: roomId, isDeleted: false },
          relations: ['members'],
        });
        if (!roomFound) {
          return null;
        }

        // Get readReceipt by id
        const readReceiptFound = await ReadReceipt.findOne({
          where: { id, isDeleted: false },
        });

        const receivedAtDate = receivedAt ? new Date(receivedAt) : readReceiptFound?.receivedAt;
        const seenAtDate = seenAt ? new Date(seenAt) : readReceiptFound?.seenAt;

        const readReceipt = await ReadReceipt.create({
          id,
          user: { id: receiptUserId },
          message: { id: messageId },
          room: roomFound,
          receivedAt: receivedAtDate || undefined,
          seenAt: seenAtDate || undefined,
        }).save();

        roomsToPublish.set(roomFound.id, roomFound);

        return readReceipt;
      };

      asyncFuncs.push(...created.map(handleReadReceipts));

      asyncFuncs.push(...updated.map(handleReadReceipts));

      await Promise.all(
        asyncFuncs.map(async (p) =>
          p.catch((err) => {
            console.log(err);
            return null;
          }),
        ),
      );
    }

    /////////////////
    // Attachments //
    /////////////////
    if (changes.attachments) {
      const { created = [], updated = [] } = changes.attachments;
      const asyncFuncs: Promise<any>[] = [];

      const handleAttachments = async ({
        id,
        cipherUri,
        filename,
        type,
        width,
        height,
        userId: attachmentUserId,
        messageId,
        roomId,
      }: any) => {
        // Can only add attachment for itself
        if (attachmentUserId !== userId) {
          log('Attachment not for signed user');
          return null;
        }
        if (!cipherUri) {
          log('Attachment without cypher uri');
          return null;
        }

        // Get room by id
        const roomFound = await Room.findOne({
          where: { id: roomId, isDeleted: false },
        });
        if (!roomFound) {
          return null;
        }

        const attachment = await Attachment.create({
          id,
          cipherUri,
          filename,
          type,
          width,
          height,
          user: { id: attachmentUserId },
          message: { id: messageId },
          room: roomFound,
        }).save();

        return attachment;
      };

      asyncFuncs.push(...created.map(handleAttachments));

      asyncFuncs.push(...updated.map(handleAttachments));

      await Promise.all(
        asyncFuncs.map(async (p) =>
          p.catch((err) => {
            console.log(err);
            return null;
          }),
        ),
      );
    }

    messagesToNotify.forEach(({ title, message, roomWithMembersAndDevices }) => {
      sendPush(userId, title, message, roomWithMembersAndDevices);
    });

    // Send room so other users can sync
    const rooms = [...roomsToPublish.values()];
    log('push - publish');
    await publish({ rooms, publisherId: userId });

    return true;
  }

  @Subscription(() => Boolean, {
    topics: SHOULD_SYNC,
    filter: ({
      payload: { rooms, publisherId },
      args: { roomIds },
      context: { userId },
    }: ResolverFilterData<ShouldSyncPayload, ShouldSyncArgs, CustomContext>) => {
      if (userId === publisherId) {
        log('Skip self subscription');
        return false;
      }
      return rooms?.some((room) => {
        const isListeningTo = roomIds?.includes(room.id);
        const isMemberOf = room?.members?.some((member) => member.id === userId);
        log('Subscription filter', { isListeningTo, isMemberOf });
        return isListeningTo || isMemberOf;
      });
    },
  })
  shouldSync(@Root() _payload: ShouldSyncPayload, @Args() _args: ShouldSyncArgs): boolean {
    return true;
  }
}

function isMemberOfRoom(rooms: Room[], roomId: string, userId: string): boolean {
  const roomFound = rooms.find((room) => room.id === roomId);
  return roomFound?.members.some((member) => member.id === userId) || false;
}

function isMemberOfNewRoom(members?: RoomMemberTableChangeSet, roomId?: string, userId?: string): boolean {
  return [...(members?.created || []), ...(members?.updated || [])].some((e) => {
    return e.roomId === roomId && e.userId === userId;
  });
}
