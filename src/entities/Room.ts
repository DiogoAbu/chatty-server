import { Field, ID, ObjectType } from 'type-graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import Message from '!/entities/Message';
import User from '!/entities/User';

@ObjectType()
@Entity('rooms')
export default class Room extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'text', nullable: true })
  name?: string;

  // MANY Rooms can have MANY Users
  @Field(() => [User])
  @ManyToMany(() => User, (user) => user.rooms)
  @JoinTable()
  members: User[];

  // ONE Room can have MANY Messages
  @Field(() => [Message])
  @OneToMany(() => Message, (message) => message.room)
  messages: Message[];

  @Column({ default: false })
  isDeleted: boolean;

  @Field()
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Field()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  // Only on GraphQL
  @Field(() => Message)
  lastMessage: Message;
}
