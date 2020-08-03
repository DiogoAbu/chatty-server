import { ApolloError } from 'apollo-server';
import { Arg, Args, Authorized, Ctx, Mutation, Publisher, PubSub, Query, Resolver } from 'type-graphql';
import { FindConditions, LessThan } from 'typeorm';

import Message, { MessageType } from '!/entities/Message';
import Room from '!/entities/Room';
import User from '!/entities/User';
import { CreateMessageInput, GetMessagesArgs, GetMessagesResponse } from '!/inputs/message';
import { ShouldSyncPayload } from '!/inputs/sync';
import debug from '!/services/debug';
import { CustomContext } from '!/types';

import { SHOULD_SYNC } from './subs-types';

const log = debug.extend('message');

@Resolver(() => Message)
export class MessageResolver {
  @Authorized(['create:own:message'])
  @Mutation(() => Message)
  async createMessage(
    @Ctx() ctx: CustomContext,
    @Arg('data') data: CreateMessageInput,
    @PubSub(SHOULD_SYNC) publish: Publisher<ShouldSyncPayload>,
  ): Promise<Message> {
    // Signed in user
    const userId = ctx.userId!;
    const { roomId, messageId, cipher, type } = data;

    const userFound = await User.findOne(userId);

    // Check if user belongs to the room
    if (!userFound) {
      log('User not found (%s)', userId);
      throw new ApolloError('User not found', 'NOT_FOUND');
    }

    // Get room by id
    const roomFound = await Room.findOne({
      where: { id: roomId, isDeleted: false },
      relations: ['members', 'members.devices'],
    });

    // Check if user belongs to the room
    if (!roomFound || !roomFound.members.some((e) => e.id === userId)) {
      log('Room not found (%s)', roomId);
      throw new ApolloError('Room not found', 'NOT_FOUND');
    }

    const messageCreated = await Message.create({
      id: messageId ?? undefined,
      cipher,
      type: type ?? MessageType.default,
      sender: userFound,
      room: roomFound,
      sentAt: new Date(),
    }).save();
    log('Created message from user %s on room %s', userFound.id, roomId);

    // Send room so other users can sync
    await publish({ rooms: [roomFound], publisherId: userId });
    return messageCreated;
  }

  @Authorized(['read:own:room'])
  @Query(() => GetMessagesResponse)
  async getMessages(@Ctx() ctx: CustomContext, @Args() data: GetMessagesArgs): Promise<GetMessagesResponse> {
    const userId = ctx.userId!;
    const { afterDate, roomId, limit } = data;

    // Get room by id
    const roomFound = await Room.findOne({
      where: { id: roomId, isDeleted: false },
      relations: ['members'],
    });

    // Check if user belongs to the room
    if (!roomFound || !roomFound.members.some((e) => e.id === userId)) {
      log('Room not found (%s)', roomId);
      throw new ApolloError('Room not found', 'NOT_FOUND');
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

  // @Subscription(() => Message, {
  //   topics: MESSAGE_CREATED,
  //   filter: ({
  //     args,
  //     payload: message,
  //     context: { userId },
  //   }: ResolverFilterData<Message, MessageCreatedArgs, CustomContext>) => {
  //     // If the room is being listened and signed user is a member
  //     return (
  //       args.roomIds?.includes(message.room?.id) && message.room?.members?.some((e: User) => e.id === userId)
  //     );
  //   },
  // })
  // messageCreated(@Root() message: Message, @Args() _args: MessageCreatedArgs): Message {
  //   log('New message added on room %s', message.room?.id);
  //   return message;
  // }

  // @Subscription(() => ReadReceipt, {
  //   topics: READ_RECEIPT_CREATED,
  //   filter: ({
  //     args,
  //     payload: readReceipt,
  //   }: ResolverFilterData<ReadReceipt, ReadReceiptCreatedArgs, CustomContext>) => {
  //     // If the message is being listened
  //     return args.roomIds?.includes(readReceipt.room?.id);
  //   },
  // })
  // readReceiptCreated(@Root() readReceipt: ReadReceipt, @Args() _args: ReadReceiptCreatedArgs): ReadReceipt {
  //   log('New read receipt added on room %s', readReceipt.room?.id);
  //   return readReceipt;
  // }
}
