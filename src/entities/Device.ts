import { Field, ID, ObjectType, registerEnumType } from 'type-graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import User from '!/entities/User';

export enum DevicePlatform {
  'ios' = 'ios',
  'android' = 'android',
  'windows' = 'windows',
  'macos' = 'macos',
  'web' = 'web',
}

registerEnumType(DevicePlatform, {
  name: 'DevicePlatform',
  description: 'The acceptable platforms',
});

@ObjectType()
@Entity('devices')
export default class Device extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'text' })
  name: string;

  @Field()
  @Column({ type: 'text' })
  token: string;

  @Field(() => DevicePlatform)
  @Column({ type: 'enum', enum: DevicePlatform })
  platform: DevicePlatform;

  // MANY Devices can have only ONE User
  @Field(() => User)
  @ManyToOne(() => User)
  user: User;

  @Column({ default: false })
  isDeleted: boolean;

  @Field()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
