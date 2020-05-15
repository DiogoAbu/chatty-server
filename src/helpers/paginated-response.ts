import { ClassType, Field, ObjectType } from 'type-graphql';

export default function PaginatedResponse<TItem>(TItemClass: ClassType<TItem>) {
  // `isAbstract` decorator option is mandatory to prevent registering in schema
  @ObjectType({ isAbstract: true })
  abstract class PaginatedResponseClass {
    @Field(() => [TItemClass])
    items: TItem[];

    @Field({ defaultValue: false })
    hasMore: boolean;

    @Field()
    cursor?: Date;
  }
  return PaginatedResponseClass;
}
