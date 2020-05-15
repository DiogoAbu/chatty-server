import { IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { ArgsType, Field, ID, InputType, Int, ObjectType } from 'type-graphql';

import Message from '!/entities/Message';
import PaginatedResponse from '!/helpers/paginated-response';
import { messageNotEmpty } from '!/helpers/validation';

@InputType()
export class CreateMessageInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty({ message: messageNotEmpty })
  roomId: string;

  @Field()
  @IsString()
  @IsNotEmpty({ message: messageNotEmpty })
  messageId: string;

  @Field()
  @IsString()
  @IsNotEmpty({ message: messageNotEmpty })
  content: string;
}

@ArgsType()
export class GetMessagesArgs {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty({ message: messageNotEmpty })
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
  @IsNotEmpty({ message: messageNotEmpty })
  roomIds: string[];
}

@ObjectType()
export class GetMessagesResponse extends PaginatedResponse(Message) {}
