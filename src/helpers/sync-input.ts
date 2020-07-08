import { ClassType, Field, ObjectType } from 'type-graphql';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function SyncInput<TItem>(TItemClass: ClassType<TItem>) {
  // `isAbstract` decorator option is mandatory to prevent registering in schema
  @ObjectType({ isAbstract: true })
  abstract class SyncInputClass {
    @Field(() => [TItemClass])
    items: TItem[];
  }
  return SyncInputClass;
}
