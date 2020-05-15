import GraphQLJSON from 'graphql-type-json';
import { ArgsType, Field } from 'type-graphql';

@ArgsType()
export class PushChangesArgs {
  @Field({ description: 'Milliseconds since UNIX epoch' })
  lastPulledAt: number;

  @Field(() => GraphQLJSON)
  changes: any;
}
