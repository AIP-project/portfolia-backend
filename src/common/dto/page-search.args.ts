import { ArgsType, Field, Int } from "@nestjs/graphql"
import { IsOptional, Max, Min } from "class-validator"
import { SortInput } from "./sort.input"

@ArgsType()
export class PageSearchArgs {
  @Field(() => [SortInput], { nullable: true, defaultValue: [] })
  @IsOptional()
  sortBy?: SortInput[]

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @Min(1)
  page?: number

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @Min(1)
  @Max(100)
  take?: number

  get skip(): number {
    return (this.page! - 1) * this.take!
  }
}
