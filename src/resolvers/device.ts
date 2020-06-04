import { Arg, Authorized, Ctx, Mutation, Resolver } from 'type-graphql';

import Device from '!/entities/Device';
import User from '!/entities/User';
import { RegisterDeviceInput } from '!/inputs/device';
import debug from '!/services/debug';
import { MyContext } from '!/types';

const log = debug.extend('device');

@Resolver()
export class DeviceResolver {
  @Authorized()
  @Mutation(() => Boolean)
  async registerDevice(
    @Ctx() ctx: MyContext,
    @Arg('data') data: RegisterDeviceInput,
  ): Promise<boolean> {
    // Signed in user
    const { id: userId } = ctx.user!;

    const { token, platform } = data;

    const user = await User.findOne({
      where: { id: userId, isDeleted: false },
      relations: ['devices'],
    });

    if (!user?.devices.some((each) => each.token === token)) {
      log('Device not found, creating for %s with token %s', platform, token);

      await Device.create({
        token,
        platform,
        user,
      }).save();

      return true;
    }

    log('Device found for %s with token %s', platform, token);

    return true;
  }
}
