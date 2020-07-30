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

import Attachment from './Attachment';
import ReadReceipt from './ReadReceipt';
import RoomPreferences from './RoomPreferences';

@ObjectType()
@Entity('rooms')
export default class Room extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'text', nullable: true })
  name?: string;

  @Field()
  @Column({ type: 'text', nullable: true })
  pictureUri?: string;

  // MANY Rooms can have MANY Users
  @Field(() => [User])
  @ManyToMany(() => User, (user) => user.rooms)
  @JoinTable()
  members: User[];

  // ONE Room can have MANY Messages
  @Field(() => [Message])
  @OneToMany(() => Message, (message) => message.room)
  messages: Message[];

  // ONE Room can have MANY Messages
  @Field(() => [ReadReceipt])
  @OneToMany(() => ReadReceipt, (readReceipt) => readReceipt.room)
  readReceipts: ReadReceipt[];

  @Field(() => [Attachment])
  @OneToMany(() => Attachment, (attachment) => attachment.room)
  attachments: Attachment[];

  // ONE Room can have MANY Room preferences
  @Field(() => [RoomPreferences])
  @OneToMany(() => RoomPreferences, (roomPreferences) => roomPreferences.room)
  roomPreferences: RoomPreferences[];

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
