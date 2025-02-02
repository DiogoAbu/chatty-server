import { Field, ID, ObjectType } from 'type-graphql';
import {
  AfterLoad,
  BaseEntity,
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ROLES } from '!/services/authorization';
import { comparePass, hashPass } from '!/services/encryption';

import Attachment from './Attachment';
import Device from './Device';
import Message from './Message';
import ReadReceipt from './ReadReceipt';
import Room from './Room';
import RoomPreferences from './RoomPreferences';

@ObjectType()
@Entity('users')
export default class User extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'text', nullable: true })
  name?: string;

  @Field()
  @Column({ type: 'text', nullable: true })
  pictureUri?: string;

  @Field()
  @Column({ type: 'text', unique: true })
  email: string;

  @Column({ type: 'text', select: false })
  password: string;

  @Column({ type: 'text', unique: true, nullable: true, select: false })
  passwordChangeCode: number | null;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  passwordChangeExpires: Date | null;

  @Field()
  @Column({ type: 'enum', enum: ROLES, default: 'user' })
  role: string;

  @Field()
  @Column({ type: 'text', unique: true, nullable: true })
  publicKey?: string;

  @Field()
  @Column({ type: 'text', unique: true, nullable: true })
  derivedSalt?: string;

  @Field()
  @Column({ type: 'timestamptz', select: false })
  lastAccessAt: Date;

  // MANY Users can have MANY Rooms
  @Field(() => [Room])
  @ManyToMany(() => Room, (room) => room.members)
  rooms: Room[];

  @Field(() => [Message])
  @OneToMany(() => Message, (message) => message.sender)
  messages: Message[];

  @Field(() => [ReadReceipt])
  @OneToMany(() => ReadReceipt, (readReceipt) => readReceipt.user)
  readReceipts: ReadReceipt[];

  @Field(() => [Attachment])
  @OneToMany(() => Attachment, (attachment) => attachment.user)
  attachments: Attachment[];

  @ManyToMany(() => User, (user) => user.followersInverse, {
    cascade: false,
  })
  @JoinTable()
  followers: User[];

  @ManyToMany(() => User, (user) => user.followers, {
    cascade: ['insert', 'update'],
  })
  followersInverse: User[];

  // ONE User can have MANY Devices
  @Field(() => [Device])
  @OneToMany(() => Device, (device) => device.user, { onDelete: 'CASCADE' })
  devices: Device[];

  // ONE User can have MANY Room preferences
  @Field(() => [RoomPreferences])
  @OneToMany(() => RoomPreferences, (roomPreferences) => roomPreferences.user, { onDelete: 'CASCADE' })
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
  @Field(() => Boolean, { nullable: true })
  isFollowingMe: boolean | null;

  // Only on GraphQL
  @Field(() => Boolean, { nullable: true })
  isFollowedByMe: boolean | null;

  private tempPassword: string;

  @AfterLoad()
  private loadTempPassword(): void {
    this.tempPassword = this.password;
  }

  /**
   * Check if password is modified and replace it with its encrypted version.
   */
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    // Only hash if password have been modified, or is new
    if (this.tempPassword === this.password) {
      return;
    }

    try {
      this.password = await hashPass({ plain: this.password });
      this.loadTempPassword();
      return;
    } catch (err) {
      return;
    }
  }

  // @instanceMethod
  async matchPassword(plain: string): Promise<boolean> {
    return comparePass({ plain, hashed: this.password });
  }
}
