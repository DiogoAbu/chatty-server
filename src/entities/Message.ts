import { Field, ID, ObjectType, registerEnumType } from 'type-graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import Room from '!/entities/Room';
import User from '!/entities/User';

import ReadReceipt from './ReadReceipt';

export enum MessageType {
  'default' = 'default',
  'announcement' = 'announcement',
  'sharedKey' = 'sharedKey',
}

registerEnumType(MessageType, {
  name: 'MessageType',
  description: 'The message types',
});

@ObjectType()
@Entity('messages')
export default class Message extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'text' })
  cipher: string;

  @Field(() => MessageType)
  @Column({ type: 'enum', enum: MessageType, default: MessageType.default })
  type: MessageType;

  // MANY Messages can have only ONE User
  @Field(() => User)
  @ManyToOne(() => User)
  sender: User;

  // MANY Messages can have only ONE Room
  @Field(() => Room)
  @ManyToOne(() => Room, (room) => room.messages)
  room: Room;

  @Field(() => [ReadReceipt])
  @OneToMany(() => ReadReceipt, (readReceipt) => readReceipt.message)
  readReceipts: ReadReceipt[];

  @Column({ default: false })
  isDeleted: boolean;

  @Field()
  @Column({ type: 'timestamptz' })
  sentAt: Date;

  @Field()
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Field()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
