import { ApolloError } from 'apollo-server';
import {
  Arg,
  Args,
  Authorized,
  Ctx,
  FieldResolver,
  Mutation,
  Query,
  Resolver,
  Root,
} from 'type-graphql';

import User from '!/entities/User';
import randomInteger from '!/helpers/random-integer';
import {
  ChangePasswordInput,
  CreateAccountInput,
  ForgotPasswordInput,
  ListUsersArgs,
  SignInInput,
  SignInResponse,
} from '!/inputs/user';
import { toToken } from '!/services/authentication';
import { ac } from '!/services/authorization';
import debug from '!/services/debug';
import mailer from '!/services/mailer';
import { MyContext } from '!/types';

const log = debug.extend('user');
const DAYS = parseInt(process.env.PASSWORD_CHANGE_EXPIRE_DAYS!, 10) || 1;

@Resolver(() => User)
export class UserResolver {
  @Authorized(['read:own:account'])
  @Query(() => User)
  me(@Ctx() ctx: MyContext): User {
    // Signed in user
    const { user } = ctx;

    // Filter attributes it's not allowed to see
    const filtered = ctx.permissions[0].filter(user) as User;
    return filtered;
  }

  @Mutation(() => SignInResponse)
  async createAccount(@Arg('data') data: CreateAccountInput): Promise<SignInResponse> {
    const { name, email, password, pictureUri } = data;

    const user = await User.create({
      name,
      email,
      password,
      pictureUri,
      lastAccessAt: new Date(),
    }).save();

    // Get permission for the role and the current action
    const permission = ac.can(user.role).readOwn('account');

    return {
      user: permission.filter(user),
      token: await toToken(user),
    };
  }

  @Mutation(() => SignInResponse)
  async signIn(@Arg('data') data: SignInInput): Promise<SignInResponse> {
    const { email, password } = data;
    const user = await User.findOne(
      { email },
      {
        select: [
          'id',
          'name',
          'email',
          'password',
          'pictureUri',
          'role',
          'lastAccessAt',
          'createdAt',
        ],
      },
    );

    if (!user) {
      throw new ApolloError('User not found', 'NOT_FOUND');
    }

    if (!(await user.matchPassword(password))) {
      // Does not disclose the existence of the email
      throw new ApolloError('User not found', 'NOT_FOUND');
    }

    // Update the last acccess datetime
    user.lastAccessAt = new Date();
    await user.save();

    // Get permission for the role and the current action
    const permission = ac.can(user.role).readOwn('account');

    return {
      user: permission.filter(user),
      token: await toToken(user),
    };
  }

  @Mutation(() => Boolean, {
    description: 'Find the user, store an one-time-password, and send it to the user`s email.',
  })
  async forgotPassword(@Arg('data') data: ForgotPasswordInput): Promise<boolean> {
    const { email } = data;

    const user = await User.findOne({ email });
    if (!user) {
      // Returns true even if not found to not disclose the existence of the email
      return true;
    }

    // Create token until it's unique
    let code = randomInteger(6);
    while (await User.findOne({ passwordChangeCode: code })) {
      code = randomInteger(6);
    }

    // Get date and add expiration days
    const date = new Date();
    date.setDate(date.getDate() + DAYS);

    // Update user document
    user.passwordChangeCode = code;
    user.passwordChangeExpires = date;

    await user.save();
    try {
      await mailer(email, code);
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      const msg = `${e.name}:${e.message}`;
      throw new ApolloError("Failed to send code to user's email (" + msg + ')');
    }

    return true;
  }

  @Mutation(() => Boolean, {
    description:
      'Find the user related to the one-time-password, check its validity, and update the password.',
  })
  async changePassword(@Arg('data') data: ChangePasswordInput): Promise<boolean> {
    const { code, password } = data;

    const user = await User.findOne(
      { passwordChangeCode: code },
      {
        select: [
          'createdAt',
          'email',
          'id',
          'isDeleted',
          'lastAccessAt',
          'name',
          'passwordChangeCode',
          'passwordChangeExpires',
          'role',
          'updatedAt',
        ],
      },
    );
    if (!user) {
      throw new ApolloError('Code not found', 'NOT_FOUND');
    }

    const now = Date.now();
    const expires = user.passwordChangeExpires!.getTime();

    // If today is greater than the expire date
    if (now > expires) {
      throw new ApolloError('Code is invalid', 'NOT_ACCEPTABLE');
    }

    // Update user document
    user.password = password;
    user.passwordChangeCode = null;
    user.passwordChangeExpires = null;

    await user.save();

    return true;
  }

  @Authorized()
  @Mutation(() => Boolean, {
    description: 'Add signed user as follower',
  })
  async startFollowing(
    @Arg('userId', { nullable: false }) userId: string,
    @Ctx() ctx: MyContext,
  ): Promise<boolean> {
    // Signed in user
    const { id: signedId } = ctx.user!;

    if (signedId === userId) {
      log('User cannot follow itself');
      return false;
    }

    const signedUser = await User.findOne(signedId);
    if (!signedUser) {
      throw new ApolloError('User not found', 'NOT_FOUND');
    }

    const person = await User.findOne(userId, { relations: ['followers'] });
    if (!person) {
      throw new ApolloError('User not found', 'NOT_FOUND');
    }

    // Update user document
    person.followers.push(signedUser);

    await person.save();

    return true;
  }

  @Authorized()
  @Mutation(() => Boolean, {
    description: 'Remove signed user as follower',
  })
  async stopFollowing(
    @Arg('userId', { nullable: false }) userId: string,
    @Ctx() ctx: MyContext,
  ): Promise<boolean> {
    // Signed in user
    const { id: signedId } = ctx.user!;

    if (signedId === userId) {
      log('User cannot unfollow itself');
      return false;
    }

    const signedUser = await User.findOne(signedId);
    if (!signedUser) {
      throw new ApolloError('User not found', 'NOT_FOUND');
    }

    const person = await User.findOne(userId, { relations: ['followers'] });
    if (!person) {
      throw new ApolloError('User not found', 'NOT_FOUND');
    }

    // Update user document
    person.followers = person.followers.filter((each) => each.id !== signedId);

    await person.save();

    return true;
  }

  @Authorized()
  @Query(() => [User])
  async listUsers(@Args() data: ListUsersArgs): Promise<User[]> {
    const { where, order, skip, take } = data;

    let query = User.createQueryBuilder('u');

    if (where?.name) {
      query = query.andWhere('u.name ILIKE :name', { name: where.name });
    }
    if (where?.email) {
      query = query.andWhere('u.email ILIKE :email', { email: where.email });
    }

    if (order?.name) {
      query = query.addOrderBy('u.name', order.name === 'DESC' ? 'DESC' : 'ASC');
    }
    if (order?.email) {
      query = query.addOrderBy('u.email', order.email === 'DESC' ? 'DESC' : 'ASC');
    }

    return query.andWhere('u.isDeleted = false').skip(skip).take(take).getMany();
  }

  @FieldResolver(() => Boolean, {
    nullable: true,
    description: 'If user is following the signed user',
  })
  async isFollowingMe(@Root() user: User, @Ctx() ctx: MyContext): Promise<boolean | null> {
    // Signed in user
    const { id: signedId } = ctx.user!;

    if (signedId === user.id) {
      return null;
    }

    // Signed user has the specified user as follower
    const userFound = await User.createQueryBuilder('user')
      .leftJoinAndSelect('user.followers', 'follower')
      .where('user.id = :signedId AND user.isDeleted = false', { signedId })
      .andWhere('follower.id = :id', { id: user.id })
      .getOne();

    return !!userFound;
  }

  @FieldResolver(() => Boolean, {
    nullable: true,
    description: 'If signed user is following the user',
  })
  async isFollowedByMe(@Root() user: User, @Ctx() ctx: MyContext): Promise<boolean | null> {
    // Signed in user
    const { id: signedId } = ctx.user!;

    if (signedId === user.id) {
      return null;
    }

    // Specified user has the signed user as follower
    const userFound = await User.createQueryBuilder('user')
      .leftJoinAndSelect('user.followers', 'follower')
      .where('user.id = :id AND user.isDeleted = false', { id: user.id })
      .andWhere('follower.id = :signedId', { signedId })
      .getOne();

    return !!userFound;
  }
}
