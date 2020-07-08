import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import User from '!/entities/User';

import Message from './Message';
import Room from './Room';

@ObjectType()
@Entity('read_receipts')
export default class ReadReceipt extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // MANY ReadReceipts can have only ONE User
  @Field(() => User)
  @ManyToOne(() => User)
  user: User;

  @Field(() => Message)
  @ManyToOne(() => Message)
  message: Message;

  @Field(() => Room)
  @ManyToOne(() => Room)
  room: Room;

  @Field(() => Number)
  @Column({ type: 'timestamptz', nullable: true })
  receivedAt: Date | null;

  @Field(() => Number)
  @Column({ type: 'timestamptz', nullable: true })
  seenAt: Date | null;

  @Column({ default: false })
  isDeleted: boolean;

  @Field()
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
