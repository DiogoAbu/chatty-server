import { IsNotEmpty } from 'class-validator';
import { Field, InputType } from 'type-graphql';

import { DevicePlatform } from '!/entities/Device';

const messageNotEmpty = 'Should not be empty';

@InputType()
export class RegisterDeviceInput {
  @Field()
  @IsNotEmpty({ message: messageNotEmpty })
  token: string;

  @Field(() => DevicePlatform)
  @IsNotEmpty({ message: messageNotEmpty })
  platform: DevicePlatform;
}
