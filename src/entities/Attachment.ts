import { Field, ID, ObjectType, registerEnumType } from 'type-graphql';
import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import User from '!/entities/User';

import Message from './Message';
import Room from './Room';

export enum AttachmentType {
  'image' = 'image',
  'video' = 'video',
  'document' = 'document',
}

registerEnumType(AttachmentType, {
  name: 'AttachmentType',
  description: 'The attachment types',
});

@ObjectType()
@Entity('attachments')
export default class Attachment extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  cipherUri: string;

  @Field(() => AttachmentType)
  @Column({ type: 'enum', enum: AttachmentType })
  type: AttachmentType;

  @Field()
  @Column({ nullable: true })
  width?: number;

  @Field()
  @Column({ nullable: true })
  height?: number;

  // MANY Attachments can have only ONE User
  @Field(() => User)
  @ManyToOne(() => User)
  user: User;

  @Field(() => Message)
  @ManyToOne(() => Message)
  message: Message;

  @Field(() => Room)
  @ManyToOne(() => Room)
  room: Room;
}
