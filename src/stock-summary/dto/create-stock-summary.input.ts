import { Field, InputType, OmitType } from "@nestjs/graphql"
import { IsString } from "class-validator"
import { StockSummaryInput } from "./stock-summary.input"

@InputType()
export class CreateStockSummaryInput extends OmitType(StockSummaryInput, ["id"]) {
  @Field({ nullable: false, description: "주식 요약 정보 계좌 번호" })
  @IsString()
  accountNumber!: string
}
