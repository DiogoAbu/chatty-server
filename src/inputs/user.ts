import { IsEmail, IsNotEmpty, IsOptional, Length, Max, Min } from 'class-validator';
import { ArgsType, Field, InputType, Int, ObjectType } from 'type-graphql';

import User from '!/entities/User';
import { messageLength, messageNotEmpty } from '!/helpers/validation';

import { IsEmailNotUnique } from './validators/is-email-not-unique';

@InputType()
export class CreateAccountInput implements Partial<User> {
  @Field()
  @IsNotEmpty({ message: messageNotEmpty })
  @Length(2, 100, { message: messageLength })
  name: string;

  @Field()
  @IsNotEmpty({ message: messageNotEmpty })
  @IsEmail(undefined, { message: 'Must be a valid email' })
  @IsEmailNotUnique()
  email: string;

  @Field()
  @IsNotEmpty({ message: messageNotEmpty })
  @Length(2, undefined, { message: messageLength })
  password: string;
}

@InputType()
export class SignInInput implements Partial<User> {
  @Field()
  @IsNotEmpty({ message: messageNotEmpty })
  @Length(2, 100, { message: messageLength })
  email: string;

  @Field()
  @IsNotEmpty({ message: messageNotEmpty })
  @Length(2, undefined, { message: messageLength })
  password: string;
}

@InputType()
export class ForgotPasswordInput implements Partial<User> {
  @Field()
  @IsNotEmpty({ message: messageNotEmpty })
  @IsEmail()
  email: string;
}

@InputType()
export class ChangePasswordInput implements Partial<User> {
  @Field()
  @IsNotEmpty({ message: messageNotEmpty })
  code: number;

  @Field()
  @IsNotEmpty({ message: messageNotEmpty })
  @Length(2, undefined, { message: messageLength })
  password: string;
}

@InputType()
export class ListUsersWhere {
  @Field()
  @IsNotEmpty({ message: messageNotEmpty })
  name: string;

  @Field()
  @IsNotEmpty({ message: messageNotEmpty })
  email: string;
}

@InputType()
export class ListUsersOrder {
  @Field()
  @IsNotEmpty({ message: messageNotEmpty })
  name: 'ASC' | 'DESC';

  @Field()
  @IsNotEmpty({ message: messageNotEmpty })
  email: 'ASC' | 'DESC';
}

@ArgsType()
export class ListUsersArgs {
  @Field()
  @IsNotEmpty({ message: messageNotEmpty })
  where: ListUsersWhere;

  @Field()
  @IsOptional()
  order?: ListUsersOrder;

  @Field(() => Int, { defaultValue: 0 })
  @Min(0)
  @IsOptional()
  skip?: number;

  @Field(() => Int, { defaultValue: 10 })
  @Min(1)
  @Max(50)
  @IsOptional()
  take?: number;
}

@ObjectType()
export class SignInResponse {
  @Field(() => User)
  user: User;

  @Field()
  token: string;
}
