import { ArgsType, Field } from "@nestjs/graphql"
import { IsNumber, IsOptional } from "class-validator"
import { PageSearchArgs } from "../../common"

@ArgsType()
export class CoinSummariesArgs extends PageSearchArgs {
  @Field(() => Number, { nullable: false })
  @IsOptional()
  @IsNumber()
  accountId!: number
}
