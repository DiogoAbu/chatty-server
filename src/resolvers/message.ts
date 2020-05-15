import { ApolloError } from 'apollo-server';
import {
  Arg,
  Args,
  Authorized,
  Ctx,
  Mutation,
  Publisher,
  PubSub,
  Query,
  Resolver,
  Root,
  Subscription,
} from 'type-graphql';
import { FindConditions, LessThan } from 'typeorm';

import Message from '!/entities/Message';
import Room from '!/entities/Room';
import User from '!/entities/User';
import {
  CreateMessageInput,
  GetMessagesArgs,
  GetMessagesResponse,
  MessageCreatedArgs,
} from '!/inputs/message';
import { sendMessage } from '!/services/android';
import debug from '!/services/debug';
import { MyContext } from '!/types';

import { MESSAGE_CREATED } from './subs-types';

const log = debug.extend('message');

@Resolver(() => Message)
export class MessageResolver {
  @Authorized(['create:own:message'])
  @Mutation(() => Message)
  async createMessage(
    @Ctx() ctx: MyContext,
    @Arg('data') data: CreateMessageInput,
    @PubSub(MESSAGE_CREATED) publish: Publisher<Message>,
  ) {
    // Signed in user
    const { id: userId, name } = ctx.user!;
    const { roomId, messageId, content } = data;

    // Get room by id
    const roomFound = await Room.findOne({
      where: { id: roomId, isDeleted: false },
      relations: ['members', 'members.devices'],
    });

    // Check if user belongs to the room
    if (!roomFound || !roomFound.members.some((e) => e.id === userId)) {
      log('Room not found (%s)', roomId);
      throw new ApolloError('Room not found');
    }

    // Room name or the user that is sending the message
    const title = roomFound.name || name;

    const messageCreated = await Message.create({
      id: messageId ?? undefined,
      content,
      user: ctx.user!,
      room: roomFound,
    }).save();
    log('Created message from user %s on room %s', ctx.user?.id, roomId);

    // Get device token of members, excluding the sender
    const tokens = roomFound.members
      .map((user) => {
        return user.devices.map((device) => {
          if (user.id === userId) {
            return null;
          }
          if (device.platform === 'android') {
            return device.token;
          }
          return null;
        });
      })
      .reduce((prev, curr) => curr.concat(...prev), []);

    // Send notification
    log('Sending notifications for %s members', tokens.length);
    sendMessage(
      {
        collapseKey: roomId,
        notification: {
          title: title || 'Chatty',
          body: content,
          icon: 'ic_launcher',
        },
        data: {
          roomId,
        },
      },
      tokens as string[],
      (err, _res) => {
        if (err) {
          log(err);
        }
      },
    );

    // Send to subscription
    await publish(messageCreated);

    return messageCreated;
  }

  @Authorized(['read:own:room'])
  @Query(() => GetMessagesResponse)
  async getMessages(
    @Ctx() ctx: MyContext,
    @Args() data: GetMessagesArgs,
  ): Promise<GetMessagesResponse> {
    const { id: userId } = ctx.user!;
    const { afterDate, roomId, limit } = data;

    // Get room by id
    const roomFound = await Room.findOne({
      where: { id: roomId, isDeleted: false },
      relations: ['members'],
    });

    // Check if user belongs to the room
    if (!roomFound || !roomFound.members.some((e) => e.id === userId)) {
      log('Room not found (%s)', roomId);
      throw new ApolloError('Room not found');
    }

    log('Getting messages with limit %s and afterDate %s', limit, afterDate);

    // Find messages of this room
    const where: FindConditions<Message> = {
      room: { id: roomId, isDeleted: false },
    };

    // Apply date restrictions
    if (afterDate) {
      where.createdAt = LessThan(afterDate);
    }

    const messages = await Message.find({
      where,
      relations: ['user', 'room'],
      take: limit,
      order: { createdAt: 'DESC' },
    });

    if (!messages) {
      log('No messages found');
      return {
        hasMore: false,
        cursor: undefined,
        items: [],
      };
    }

    // Cursor is the most recent date
    const cursor = messages.length !== 0 ? messages[messages.length - 1].createdAt : undefined;

    let hasMore = false;

    // If haven`t retrived all already
    if (messages.length >= limit!) {
      hasMore = true;
    }

    log('Found %s message(s). Is there more? %s', messages.length, hasMore);
    return { hasMore, cursor, items: messages };
  }

  @Subscription(() => Message, {
    topics: MESSAGE_CREATED,
    filter: ({ args, payload: message, context: { user } }) => {
      // If the room is being listened and signed user is a member
      return (
        args.roomIds?.includes(message.room?.id) &&
        message.room?.members?.some((e: User) => e.id === user?.id)
      );
    },
  })
  messageCreated(@Root() message: Message, @Args() _args: MessageCreatedArgs): Message {
    log('New room message added on room %s', message.room?.id);
    return message;
  }
}
