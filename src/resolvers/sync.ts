/* eslint-disable @typescript-eslint/naming-convention */
import GraphQLJSON from 'graphql-type-json';
import { Arg, Args, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';

import Message from '!/entities/Message';
import Room from '!/entities/Room';
import User from '!/entities/User';
import getChanges from '!/helpers/get-changes';
import { PushChangesArgs } from '!/inputs/sync';
import debug from '!/services/debug';
import { MyContext, SyncPullResult } from '!/types';

const UUID_LENGTH = 36;

const log = debug.extend('sync');

@Resolver()
export class SyncResolver {
  @Authorized()
  @Query(() => GraphQLJSON)
  async pullChanges(
    @Ctx() ctx: MyContext,
    @Arg('lastPulledAt', { nullable: true, description: 'Milliseconds since UNIX epoch' })
    lastPulledAt?: number,
  ): Promise<SyncPullResult<Message | Room | User>> {
    // Signed in user
    const { id: userId } = ctx.user!;

    const lastPulledDate = lastPulledAt ? new Date(lastPulledAt) : new Date(1970, 0);

    log('Sending changes after %s (%s)', lastPulledDate, lastPulledAt);

    const result: SyncPullResult<Message | Room | User> = {
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
        room_members: {
          created: [],
          updated: [],
          deleted: [],
        },
      },
      timestamp: 0,
    };

    // Get changes for signed user
    const user = await User.createQueryBuilder('user')
      .leftJoinAndSelect('user.rooms', 'room', 'room.updatedAt > :lastPulledDate', {
        lastPulledDate,
      })
      .leftJoinAndSelect('room.members', 'member', 'member.updatedAt > :lastPulledDate', {
        lastPulledDate,
      })
      .leftJoinAndSelect('room.messages', 'message', 'message.updatedAt > :lastPulledDate', {
        lastPulledDate,
      })
      .leftJoinAndSelect('message.user', 'messageUser')
      .leftJoinAndSelect('message.room', 'messageRoom')
      .leftJoinAndSelect('user.followers', 'follower')
      .leftJoinAndSelect('member.followers', 'memberFollower')
      .where('user.id = :userId AND user.isDeleted = false', { userId })
      .getOne();

    // Check for rooms
    if (user?.rooms.length) {
      const users: any[] = [];
      const roomMembers: any[] = [];
      const messages: any[] = [];

      const rooms = user.rooms.map((room) => {
        // Get users and room members
        room.members.map((member) => {
          const { id, name, email, pictureUri, role, followers } = member;

          // Add user
          users.push({
            id,
            name,
            email,
            pictureUri,
            role,
            is_following_me: id === user.id ? null : user.followers.some((e) => e.id === id),
            is_followed_by_me: id === user.id ? null : followers.some((e) => e.id === user.id),
          });

          // Add member
          roomMembers.push({
            id: member.id + room.id,
            user_id: member.id,
            room_id: room.id,
          });
        });

        let lastMessageId: string | undefined;
        let lastMessageTime: number | undefined;

        // Get messages
        messages.push(
          ...room.messages.map((msg) => {
            // Get message created date
            const messageTime = new Date(msg.createdAt).getTime();

            // Compare message with last one
            if (!lastMessageTime || messageTime >= lastMessageTime) {
              lastMessageTime = messageTime;
              lastMessageId = msg.id;
            }

            return {
              id: msg.id,
              content: msg.content,
              user_id: msg.user.id,
              room_id: msg.room.id,
              created_at: msg.createdAt.getTime(),
            };
          }),
        );

        const { id, name, pictureUri } = room;

        // Get rooms
        return {
          id,
          name,
          pictureUri,
          created_at: room.createdAt.getTime(),
          last_message_id: lastMessageId,
        };
      });

      result.changes.users = getChanges(users);
      result.changes.rooms = getChanges(rooms);
      result.changes.messages = getChanges(messages);
      result.changes.room_members = getChanges(roomMembers);
    }

    // Get current timestamp
    result.timestamp = Date.now();

    return result;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async pushChanges(@Ctx() ctx: MyContext, @Args() data: PushChangesArgs): Promise<boolean> {
    // Signed in user
    const { id: userId } = ctx.user!;

    const { changes, lastPulledAt } = data;
    const lastPulledDate = new Date(lastPulledAt);

    log('Receiving changes for %s (%s)', lastPulledDate, lastPulledAt);

    const asyncFuncs: Promise<any>[] = [];

    if (changes.users) {
      const { updated } = changes.users;

      // Only update self
      const userFound = updated.find(({ id }: any) => id === userId);
      if (userFound) {
        await User.update(userId, {
          name: userFound.name,
          email: userFound.email,
          pictureUri: userFound.pictureUri,
        });
      }
    }

    if (changes.rooms) {
      const { created, updated, deleted } = changes.rooms;

      const user = await User.findOne({
        where: { id: userId, isDeleted: false },
        relations: ['rooms', 'rooms.members'],
      });

      if (user?.rooms) {
        asyncFuncs.push(
          ...created.map(async ({ id, name, pictureUri }: any) => {
            return Room.create({
              id,
              name,
              pictureUri,
            }).save();
          }),
        );

        asyncFuncs.push(
          ...updated.map(async ({ id, name, pictureUri }: any) => {
            if (!isMemberOfRoom(user.rooms, id, userId)) {
              return null;
            }
            return Room.update(id, {
              name,
              pictureUri,
            });
          }),
        );

        asyncFuncs.push(
          ...deleted.map(async (id: any) => {
            if (!isMemberOfRoom(user.rooms, id, userId)) {
              return null;
            }
            const roomFound = await Room.findOne(id);
            return roomFound?.remove();
          }),
        );
      }
    }

    if (changes.room_members) {
      const { created, deleted } = changes.room_members;

      asyncFuncs.push(
        ...created.map(async ({ user_id: memberId, room_id: roomId }: any) => {
          const roomFound = await Room.findOne({
            where: { id: roomId, isDeleted: false },
            relations: ['members'],
          });
          if (!roomFound) {
            return null;
          }

          // Can only change room that he's member of
          if (!roomFound?.members.find((e) => e.id === userId)) {
            return null;
          }

          const member = await User.findOne({ where: { id: memberId, isDeleted: false } });
          if (!member) {
            return null;
          }

          // Add new member
          if (!roomFound?.members.find((e) => e.id === member.id)) {
            roomFound?.members.push(member);
          }

          return roomFound?.save();
        }),
      );

      asyncFuncs.push(
        ...deleted.map(async (id: string) => {
          const memberId = id.substring(0, UUID_LENGTH);
          const roomId = id.substring(UUID_LENGTH);

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
    }

    if (changes.messages) {
      const { created, updated, deleted } = changes.messages;

      asyncFuncs.push(
        ...created.map(
          async ({
            id,
            content,
            user_id: senderId,
            room_id: roomId,
            created_at: createdAt,
          }: any) => {
            // Can only add message for itself
            if (senderId !== userId) {
              return null;
            }

            // Get room by id
            const roomFound = await Room.findOne({
              where: { id: roomId, isDeleted: false },
              relations: ['members'],
            });

            // Check if user belongs to the room
            if (!roomFound || !roomFound.members.some((e) => e.id === senderId)) {
              return null;
            }

            return Message.create({
              id: id ?? undefined,
              content,
              user: ctx.user!,
              room: roomFound,
              createdAt,
            }).save();
          },
        ),
      );

      asyncFuncs.push(
        ...updated.map(async ({ id, content, user_id: senderId }: any) => {
          // Can only change message for itself
          if (senderId !== userId) {
            return null;
          }
          return Message.update(id, {
            content,
          });
        }),
      );

      asyncFuncs.push(
        ...deleted.map(async (id: any) => {
          const messageFound = await Message.findOne({
            where: { id, user: { id: userId } },
            relations: ['user'],
          });
          return messageFound?.remove();
        }),
      );
    }

    await Promise.all(
      asyncFuncs.map(async (p) =>
        p.catch((err) => {
          log(err);
          return null;
        }),
      ),
    );

    return true;
  }
}

function isMemberOfRoom(rooms: Room[], roomId: string, userId: string) {
  const roomFound = rooms.find((room) => room.id === roomId);
  return roomFound?.members.some((member) => member.id === userId) || false;
}
