import { Field, InputType, OmitType } from "@nestjs/graphql"
import { IsNumber } from "class-validator"
import { StockSummaryInput } from "./stock-summary.input"

@InputType()
export class UpdateStockSummaryInput extends OmitType(StockSummaryInput, ["symbol", "type"]) {
  @Field({ nullable: false })
  @IsNumber()
  id!: number
}
