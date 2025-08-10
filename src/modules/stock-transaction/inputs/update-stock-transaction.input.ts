import { Field, InputType, OmitType } from "@nestjs/graphql"
import { StockTransactionInput } from "./stock-transaction.input"
import { IsNumber } from "class-validator"

@InputType()
export class UpdateStockTransactionInput extends OmitType(StockTransactionInput, ["symbol", "name"]) {
  @Field({ nullable: false, description: "주식 거래 ID" })
  @IsNumber()
  id!: number
}
