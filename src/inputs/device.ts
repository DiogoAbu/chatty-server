import { IsNotEmpty } from 'class-validator';
import { Field, InputType } from 'type-graphql';

import { DevicePlatform } from '!/entities/Device';

@InputType()
export class RegisterDeviceInput {
  @Field()
  @IsNotEmpty()
  token: string;

  @Field(() => DevicePlatform)
  @IsNotEmpty()
  platform: DevicePlatform;
}
