import { Arg, Authorized, Ctx, Mutation, Resolver } from 'type-graphql';

import Device from '!/entities/Device';
import User from '!/entities/User';
import { RegisterDeviceInput } from '!/inputs/device';
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

    const user = await User.findOne({
      where: { id: userId, isDeleted: false },
      relations: ['devices'],
    });

    if (!user?.devices?.some((each) => each.token === token)) {
      log('Device not found, creating %s for %s with token %s', name, platform, token);

      await Device.create({
        name,
        token,
        platform,
        user,
      }).save();

      return true;
    }

    log('Device found for %s with token %s', platform, token);

    return true;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async unregisterDevice(
    @Ctx() ctx: CustomContext,
    @Arg('data') data: RegisterDeviceInput,
  ): Promise<boolean> {
    // Signed in user
    const userId = ctx.userId!;

    const { token, platform } = data;

    const user = await User.findOne({
      where: { id: userId, isDeleted: false },
      relations: ['devices'],
    });

    const deviceFound = user?.devices?.find((each) => each.token === token);
    if (!deviceFound) {
      log('Device not found for %s with token %s', platform, token);
      return true;
    }

    log('Device found, removing for %s with token %s', platform, token);

    await deviceFound.remove();

    return true;
  }
}
