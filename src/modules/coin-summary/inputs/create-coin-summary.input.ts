import { Field, InputType, OmitType } from "@nestjs/graphql"
import { CoinSummaryInput } from "./coin-summary.input"
import { CurrencyType } from "@prisma/client"
import { IsEnum } from "class-validator"

@InputType()
export class CreateCoinSummaryInput extends OmitType(CoinSummaryInput, ["id"]) {
  @Field(() => CurrencyType, { nullable: false, description: "계좌 통화" })
  @IsEnum(CurrencyType)
  currency!: CurrencyType
}
