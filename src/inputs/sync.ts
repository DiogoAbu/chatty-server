import GraphQLJSON from 'graphql-type-json';
import { ArgsType, Field, ID, ObjectType } from 'type-graphql';

import { SyncChanges } from '!/types';

@ArgsType()
export class PullChangesArgs {
  @Field({ description: 'Last time client pulled changes in milliseconds since UNIX epoch' })
  lastPulledAt?: number;
}

@ObjectType()
export class PullChangesResult {
  @Field({ description: 'Last successful pull in milliseconds since UNIX epoch', nullable: false })
  timestamp: number;

  @Field(() => GraphQLJSON)
  changes: SyncChanges;
}

@ArgsType()
export class PushChangesArgs {
  @Field({ description: 'Last time client pulled changes in milliseconds since UNIX epoch' })
  lastPulledAt: number;

  @Field(() => GraphQLJSON)
  changes: SyncChanges;
}

@ArgsType()
export class ShouldSyncArgs {
  @Field(() => [ID])
  roomIds?: string[];
}
