import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Field, ID, InputType } from 'type-graphql';

import { messageNotEmpty } from '!/helpers/validation';

@InputType()
export class CreateRoomInput {
  @Field()
  @IsOptional()
  name?: string;

  @Field(() => [ID])
  @IsString({ each: true })
  @IsNotEmpty({ message: messageNotEmpty })
  recipientsId: string[];
}
