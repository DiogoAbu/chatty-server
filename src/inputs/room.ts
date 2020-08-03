import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Field, ID, InputType } from 'type-graphql';

@InputType()
export class CreateRoomInput {
  @Field(() => ID)
  @IsOptional()
  id?: string;

  @Field()
  @IsOptional()
  name?: string;

  @Field()
  @IsOptional()
  pictureUri?: string;

  @Field(() => [ID])
  @IsString({ each: true })
  @IsNotEmpty()
  recipientsId: string[];
}
