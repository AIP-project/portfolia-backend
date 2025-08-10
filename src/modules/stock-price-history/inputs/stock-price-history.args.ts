import { ArgsType, Field } from "@nestjs/graphql"
import { IsNumber } from "class-validator"
import { PageSearchArgs } from "../../../common"

@ArgsType()
export class StockPriceHistoryArgs extends PageSearchArgs {
  @Field(() => Number, { nullable: false })
  @IsNumber()
  accountId!: number
}
