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

import Device from './Device';
import Room from './Room';

@ObjectType()
@Entity('users')
export default class User extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'text' })
  name: string;

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
  @Column({ type: 'timestamptz', select: false })
  lastAccessAt: Date;

  // MANY Users can have MANY Rooms
  @Field(() => [Room])
  @ManyToMany(() => Room, (room) => room.members)
  rooms: Room[];

  @Field()
  @Column({ type: 'text', unique: true, nullable: true })
  publicKey: string;

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
  @OneToMany(() => Device, (device) => device.user)
  devices: Device[];

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
  async hashPassword() {
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
  async matchPassword(plain: string) {
    return comparePass({ plain, hashed: this.password });
  }
}
