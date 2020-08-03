import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import User from '!/entities/User';

import Room from './Room';

@ObjectType()
@Entity('roomPreferences')
export default class RoomPreferences extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ default: false })
  isMuted: boolean;

  @Field()
  @Column({ default: false })
  shouldStillNotify: boolean;

  @Field(() => Number)
  @Column({ type: 'timestamptz', nullable: true })
  mutedUntil: Date | null;

  // MANY Preferences can have only ONE User
  @Field(() => User)
  @ManyToOne(() => User)
  user: User;

  // MANY Preferences can have only ONE Room
  @Field(() => Room)
  @ManyToOne(() => Room)
  room: Room;
}
