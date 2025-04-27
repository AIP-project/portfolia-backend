import { Field, Int, ObjectType } from "@nestjs/graphql"

@ObjectType()
export class PageInfo {
  @Field(() => Int)
  total: number

  @Field(() => Int)
  page: number

  @Field(() => Int)
  take: number

  @Field(() => Boolean)
  hasNextPage: boolean

  @Field(() => Int)
  totalPages: number
}
