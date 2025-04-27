import { Field, InputType } from "@nestjs/graphql"

@InputType()
export class SortInput {
  @Field()
  field: string

  @Field()
  direction: boolean
}
