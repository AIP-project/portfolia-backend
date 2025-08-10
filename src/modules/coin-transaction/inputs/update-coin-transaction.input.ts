import { Field, InputType, OmitType } from "@nestjs/graphql"
import { CoinTransactionInput } from "./coin-transaction.input"
import { IsNumber } from "class-validator"

@InputType()
export class UpdateCoinTransactionInput extends OmitType(CoinTransactionInput, ["symbol", "name"]) {
  @Field({ nullable: false })
  @IsNumber()
  id!: number
}
