import { Field, ID, ObjectType } from 'type-graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import Room from '!/entities/Room';
import User from '!/entities/User';

@ObjectType()
@Entity('messages')
export default class Message extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'text' })
  content: string;

  // MANY Messages can have only ONE User
  @Field(() => User)
  @ManyToOne(() => User)
  user: User;

  // MANY Messages can have only ONE Room
  @Field(() => Room)
  @ManyToOne(() => Room, (room) => room.messages)
  room: Room;

  @Column({ default: false })
  isDeleted: boolean;

  @Field()
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Field()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
