import { Field, Float, InputType } from "@nestjs/graphql"
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, MinLength } from "class-validator"
import { CurrencyType, TransactionType } from "../../common"
import { Transform } from "class-transformer"

@InputType()
export class StockTransactionInput {
  @Field({ nullable: true, description: "주식 거래 ID" })
  @IsOptional()
  @IsNumber()
  id?: number

  @Field({ nullable: true, description: "주식 거래 이름" })
  @IsOptional()
  @IsString()
  name?: string

  @Field({ nullable: true, description: "주식 거래 심볼" })
  @Transform(({ value }) => (typeof value === "string" ? value.toUpperCase() : value)) // 대문자 변환
  @IsOptional()
  @IsString()
  symbol?: string

  @Field(() => Float, { nullable: true, description: "주식 거래 수량" })
  @IsOptional()
  @IsNumber()
  quantity?: number

  @Field(() => Float, { nullable: true, description: "주식 거래 금액" })
  @IsOptional()
  @IsNumber()
  amount?: number

  @Field({ nullable: true, description: "주식 거래 통화" })
  @IsOptional()
  @IsEnum(CurrencyType)
  currency?: CurrencyType

  @Field(() => TransactionType, { nullable: true, description: "주식 거래 타입" })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType

  @Field({ nullable: true, description: "비고" })
  @IsOptional()
  @IsString()
  note?: string

  @Field({ nullable: true, description: "거래 일자" })
  @IsOptional()
  @IsString()
  transactionDate?: string

  @Field({ nullable: true, description: "삭제 여부" })
  @IsOptional()
  @IsBoolean()
  isDelete?: boolean

  @Field({ nullable: true, description: "계좌 ID" })
  @IsOptional()
  @IsNumber()
  accountId?: number
}
