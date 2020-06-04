import { IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { ArgsType, Field, ID, InputType, Int, ObjectType } from 'type-graphql';

import Message from '!/entities/Message';
import PaginatedResponse from '!/helpers/paginated-response';

@InputType()
export class CreateMessageInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  content: string;
}

@ArgsType()
export class GetMessagesArgs {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @Field(() => Int, { defaultValue: 10 })
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;

  @Field()
  @IsOptional()
  afterDate?: Date;
}

@ArgsType()
export class MessageCreatedArgs {
  @Field(() => [ID])
  @IsString({ each: true })
  @IsNotEmpty()
  roomIds: string[];
}

@ObjectType()
export class GetMessagesResponse extends PaginatedResponse(Message) {}
