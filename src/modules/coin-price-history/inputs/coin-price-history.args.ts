import { ArgsType, Field } from "@nestjs/graphql"
import { IsNumber } from "class-validator"
import { PageSearchArgs } from "../../../common"

@ArgsType()
export class CoinPriceHistoryArgs extends PageSearchArgs {
  @Field(() => Number, { nullable: false })
  @IsNumber()
  accountId!: number
}
