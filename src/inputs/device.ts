import { IsNotEmpty } from 'class-validator';
import { Field, InputType } from 'type-graphql';

import { DevicePlatform } from '!/entities/Device';

@InputType()
export class RegisterDeviceInput {
  @Field({ nullable: false })
  @IsNotEmpty()
  name: string;

  @Field({ nullable: false })
  @IsNotEmpty()
  token: string;

  @Field(() => DevicePlatform, { nullable: false })
  @IsNotEmpty()
  platform: DevicePlatform;
}

@InputType()
export class UnregisterDevicesInput {
  @Field(() => [String], { nullable: false })
  @IsNotEmpty({ each: true })
  tokens: string[];
}
