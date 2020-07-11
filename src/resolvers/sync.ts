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

import Message, { MessageType } from '!/entities/Message';
import ReadReceipt from '!/entities/ReadReceipt';
import Room from '!/entities/Room';
import User from '!/entities/User';
import getChanges from '!/helpers/get-changes';
import {
  PullChangesArgs,
  PullChangesResult,
  PushChangesArgs,
  ShouldSyncArgs,
  ShouldSyncPayload,
} from '!/inputs/sync';
import debug from '!/services/debug';
import { CustomContext, SyncChanges } from '!/types';

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
      .leftJoinAndSelect('room.members', 'member')
      .leftJoinAndSelect('room.messages', 'message')
      .leftJoinAndSelect('message.sender', 'messageSender')
      .leftJoinAndSelect('message.readReceipts', 'readReceipt', 'readReceipt.updatedAt > :lastPulledDate', {
        lastPulledDate,
      })
      .leftJoinAndSelect('readReceipt.user', 'readReceiptUser')
      .leftJoinAndSelect('user.followers', 'follower')
      .leftJoinAndSelect('member.followers', 'memberFollower')
      .where('user.id = :userId AND user.isDeleted = false', { userId })
      .getOne();

    // Check for rooms
    if (user?.rooms.length) {
      const messages: any[] = [];
      const readReceipts: any[] = [];
      const rooms: any[] = [];

      const users = new Map<string, any>();
      const roomMembers = new Map<string, any>();

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

        let lastMessageId: string | undefined;
        let lastMessageTime: number | undefined;

        // Get messages
        room.messages.map((msg) => {
          readReceipts.push(
            ...msg.readReceipts.map((receipt) => {
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

          if (msg.updatedAt > lastPulledDate) {
            // Get message created date
            const messageTime = new Date(msg.createdAt).getTime();

            // Compare message with last one
            if (!lastMessageTime || messageTime >= lastMessageTime) {
              lastMessageTime = messageTime;
              lastMessageId = msg.id;
            }

            messages.push({
              id: msg.id,
              cipher: msg.cipher,
              type: msg.type,
              userId: msg.sender.id,
              roomId: room.id,
              sentAt: msg.sentAt.getTime(),
              createdAt: msg.createdAt.getTime(),
            });

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

        if (room.updatedAt > lastPulledDate || lastMessageId) {
          // Get rooms
          rooms.push({
            id,
            name,
            pictureUri,
            lastChangeAt: lastMessageTime,
            lastMessageId,
            createdAt: room.createdAt.getTime(),
          });
        }
      });

      result.changes.users = getChanges([...users.values()]);
      result.changes.rooms = getChanges(rooms);
      result.changes.messages = getChanges(messages);
      result.changes.readReceipts = getChanges(readReceipts);
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

    log('Receiving changes for %s (%s)', lastPulledDate, lastPulledAt);

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

    if (changes.rooms) {
      const { created = [], updated = [], deleted = [] } = changes.rooms;
      const asyncFuncs: Promise<any>[] = [];

      const user = await User.findOne({
        where: { id: userId, isDeleted: false },
        relations: ['rooms', 'rooms.members'],
      });

      if (user) {
        asyncFuncs.push(
          ...[...created, ...updated].map(async ({ id, name, pictureUri }) => {
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

            roomsToPublish.set(room.id, room);

            return room;
          }),
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

    if (changes.roomMembers) {
      const { created = [], updated = [], deleted = [] } = changes.roomMembers;
      const asyncFuncs: Promise<any>[] = [];

      asyncFuncs.push(
        ...[...created, ...updated].map(async ({ userId: memberId, roomId: roomId }) => {
          const roomFound = await Room.findOne({
            where: { id: roomId, isDeleted: false },
            relations: ['members'],
          });

          if (!roomFound) {
            log('Failed to add member, room not found');
            return null;
          }

          // Can only change members of room that he's member of
          if (
            !roomFound.members.some((e) => e.id === userId) &&
            !isMemberOfNewRoom(changes.roomMembers, roomFound.id, userId)
          ) {
            log('Failed to add member, not a room member');
            return null;
          }

          const member = await User.findOne({ where: { id: memberId, isDeleted: false } });
          if (!member) {
            log('Failed to add member, member does not exist');
            return null;
          }

          // Add new member
          if (!roomFound?.members.some((e) => e.id === member.id)) {
            roomFound?.members.push(member);
          }

          const room = await roomFound?.save();

          roomsToPublish.set(room.id, room);

          return room;
        }),
      );

      asyncFuncs.push(
        ...deleted.map(async (id: string) => {
          const [roomId, memberId] = id.split(SEPARATOR);

          // Can only remove self from room
          if (memberId !== userId) {
            return null;
          }

          const roomFound = await Room.findOne({
            where: { id: roomId, isDeleted: false },
            relations: ['members'],
          });
          if (!roomFound) {
            return null;
          }

          const index = roomFound.members.findIndex((e) => e.id === memberId);
          if (index >= 0) {
            roomFound.members.splice(index, 1);
          }

          return roomFound.save();
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

    if (changes.messages) {
      const { created = [], updated = [], deleted = [] } = changes.messages;
      const asyncFuncs: Promise<any>[] = [];

      asyncFuncs.push(
        ...[...created, ...updated].map(
          async ({
            id,
            cipher,
            type,
            userId: senderId,
            roomId: roomId,
            sentAt: sentAt,
            createdAt: createdAt,
          }) => {
            // Can only add message for itself
            if (senderId !== userId) {
              log('Failed to add message, sent by another user');
              return null;
            }

            const userFound = await User.findOne({
              where: { id: userId, isDeleted: false },
            });
            if (!userFound) {
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

            // Check if user belongs to the room
            if (
              !roomFound.members.some((e) => e.id === userFound.id) &&
              !isMemberOfNewRoom(changes.roomMembers, roomFound.id, userFound.id)
            ) {
              log('Failed to add message, not a room member');
              return null;
            }

            const message = await Message.create({
              id: id ?? undefined,
              cipher,
              type: type ?? MessageType.default,
              sender: userFound,
              room: roomFound,
              sentAt: sentAt ? new Date(sentAt) : undefined,
              createdAt: createdAt ? new Date(createdAt) : undefined,
              updatedAt: createdAt ? new Date(createdAt) : undefined,
            }).save();

            roomsToPublish.set(roomFound.id, roomFound);

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

    if (changes.readReceipts) {
      const { created = [], updated = [], deleted = [] } = changes.readReceipts;
      const asyncFuncs: Promise<any>[] = [];

      const handleReadReceipts = async ({
        id,
        userId: recipientId,
        messageId: messageId,
        roomId: roomId,
        receivedAt: receivedAt,
        seenAt: seenAt,
      }: any) => {
        // Can only add read receipt for itself
        if (recipientId !== userId) {
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
          user: { id: recipientId },
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

      asyncFuncs.push(
        ...deleted.map(async (id) => {
          return ReadReceipt.update(
            { id, user: { id: userId } },
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

function isMemberOfNewRoom(members: SyncChanges['roomMembers'], roomId: string, userId: string): boolean {
  return [...(members?.created || []), ...(members?.updated || [])].some((e) => {
    return e.roomId === roomId && e.userId === userId;
  });
}
