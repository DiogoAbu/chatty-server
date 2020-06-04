import { ApolloError } from 'apollo-server';
import {
  Arg,
  Authorized,
  Ctx,
  FieldResolver,
  Mutation,
  Publisher,
  PubSub,
  Query,
  Resolver,
  Root,
  Subscription,
} from 'type-graphql';

import Message from '!/entities/Message';
import Room from '!/entities/Room';
import User from '!/entities/User';
import { CreateRoomInput } from '!/inputs/room';
import debug from '!/services/debug';
import { MyContext } from '!/types';

import { ROOM_CREATED } from './subs-types';

const log = debug.extend('room');

@Resolver(() => Room)
export class RoomResolver {
  @Authorized(['create:own:room'])
  @Mutation(() => Room)
  async createRoom(
    @Ctx() ctx: MyContext,
    @Arg('data') data: CreateRoomInput,
    @PubSub(ROOM_CREATED) publish: Publisher<Room>,
  ): Promise<Room> {
    // Signed in user
    const { id: userId } = ctx.user!;
    const { name, pictureUri, recipientsId } = data;

    // No name equals one-to-one room, must have only one recipient
    if (!name) {
      if (recipientsId.length > 1) {
        log('One-to-one rooms must have only one recipient. Provide a name to create a group room');
        throw new ApolloError(
          'One-to-one rooms must have only one recipient. Provide a name to create a group room',
          'NOT_ACCEPTABLE',
        );
      }

      const recipientId = recipientsId[0];

      // Get rooms for the signed user
      // where the room does not have a name
      // and the member is the recipient
      const user = await User.createQueryBuilder('user')
        .leftJoinAndSelect('user.rooms', 'room')
        .leftJoinAndSelect('room.members', 'member')
        .where('user.id = :userId AND user.isDeleted = false', { userId })
        .andWhere('room.name IS NULL AND room.isDeleted = false')
        .andWhere('member.id = :recipientId', { recipientId })
        .getOne();

      // Return room, otherwise create it below
      if (user?.rooms?.[0]) {
        log('Room found between %s and %s', userId, recipientId);
        return user.rooms[0];
      }
    }

    // Find users based on the recipients ids
    const members = await Promise.all(
      recipientsId.map(async (eachId) => User.findOne({ where: { id: eachId, isDeleted: false } })),
    );

    const roomCreated = await Room.create({
      // Name may be null
      name,
      pictureUri,
      members: [ctx.user!, ...(members as User[])],
    }).save();

    log('Room created by %s with %s members', userId, members.length);

    // Send to subscription
    await publish(roomCreated);

    return roomCreated;
  }

  @Authorized(['read:own:room'])
  @Query(() => [Room])
  async getRooms(@Ctx() ctx: MyContext): Promise<Room[] | undefined> {
    // Signed in user
    const { id: userId } = ctx.user!;

    const user = await User.findOne({
      where: { id: userId, isDeleted: false },
      relations: ['rooms', 'rooms.members'],
    });

    return user?.rooms;
  }

  @Subscription(() => Room, {
    topics: ROOM_CREATED,
    filter: ({ context: { user }, payload: room }) => {
      // Signed user is a member
      return room.members?.some((e: User) => e.id === user?.id);
    },
  })
  roomCreated(@Root() room: Room): Room {
    log('New room added %s', room.id);
    return room;
  }

  @FieldResolver()
  async lastMessage(@Root() room: Room): Promise<Message | undefined> {
    // Get the most recent message of the room being resolved
    return Message.findOne({
      where: { room: { id: room.id }, isDeleted: false },
      order: { createdAt: 'DESC' },

      // Does not need to get 'room' because it`s already a child of it
      relations: ['user'],
    });
  }
}
