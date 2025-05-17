import { Field, Float, InputType, OmitType } from "@nestjs/graphql"
import { StockTransactionInput } from "./stock-transaction.input"
import { IsEnum, IsNumber, IsString, MinLength } from "class-validator"
import { TransactionType } from "../../common"
import { Transform } from "class-transformer"

@InputType()
export class CreateStockTransactionInput extends OmitType(StockTransactionInput, ["id"]) {
  @Field({ nullable: false, description: "주식 거래 심볼" })
  @Transform(({ value }) => (typeof value === "string" ? value.toUpperCase() : value)) // 대문자 변환
  @IsString()
  symbol!: string

  @Field(() => Float, { nullable: false, description: "주식 거래 수량" })
  @IsNumber()
  quantity!: number

  @Field(() => Float, { nullable: false, description: "주식 거래 금액" })
  @IsNumber()
  amount!: number

  @Field(() => TransactionType, { nullable: false, description: "주식 거래 타입" })
  @IsEnum(TransactionType)
  type!: TransactionType

  @Field({ nullable: false, description: "거래 일자" })
  @IsString()
  transactionDate!: string

  @Field({ nullable: false, description: "계좌 ID" })
  @IsNumber()
  accountId!: number
}
