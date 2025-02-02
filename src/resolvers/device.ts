import { ApolloError } from 'apollo-server';
import { Arg, Authorized, Ctx, Mutation, Resolver } from 'type-graphql';

import Device from '!/entities/Device';
import User from '!/entities/User';
import { RegisterDeviceInput, UnregisterDevicesInput } from '!/inputs/device';
import debug from '!/services/debug';
import { CustomContext } from '!/types';

const log = debug.extend('device');

@Resolver()
export class DeviceResolver {
  @Authorized()
  @Mutation(() => Boolean)
  async registerDevice(@Ctx() ctx: CustomContext, @Arg('data') data: RegisterDeviceInput): Promise<boolean> {
    // Signed in user
    const userId = ctx.userId!;

    const { name, token, platform } = data;

    const deviceFound = await Device.find({
      where: { token, isDeleted: false },
    });

    await Device.remove(deviceFound);

    const deviceCreated = await Device.create({
      name,
      token,
      platform,
      user: { id: userId },
    }).save();

    log('Device added', deviceCreated.name, deviceCreated.platform);

    return true;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async unregisterDevices(
    @Ctx() ctx: CustomContext,
    @Arg('data') data: UnregisterDevicesInput,
  ): Promise<boolean> {
    // Signed in user
    const userId = ctx.userId!;

    const user = await User.findOne({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      throw new ApolloError('User not found', 'NOT_FOUND');
    }

    const { tokens } = data;

    if (!tokens.length) {
      return true;
    }

    log('Removing %s tokens from %s', tokens.length, user.name);

    await Device.createQueryBuilder()
      .delete()
      .where('token IN (:tokens)', { tokens: tokens.join(', ') })
      .execute();

    return true;
  }
}
