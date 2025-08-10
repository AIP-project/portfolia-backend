import { Field, InputType, OmitType } from "@nestjs/graphql"
import { IsEnum, IsString } from "class-validator"
import { StockSummaryInput } from "./stock-summary.input"
import { CurrencyType } from "@prisma/client"

@InputType()
export class CreateStockSummaryInput extends OmitType(StockSummaryInput, ["id"]) {
  @Field({ nullable: false, description: "주식 요약 정보 계좌 번호" })
  @IsString()
  accountNumber!: string

  @Field(() => CurrencyType, { nullable: false, description: "계좌 통화" })
  @IsEnum(CurrencyType)
  currency!: CurrencyType
}
