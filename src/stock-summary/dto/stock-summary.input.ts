import { Field, Float, InputType } from "@nestjs/graphql"
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from "class-validator"
import { CurrencyType, SummaryType } from "@prisma/client"

@InputType()
export class StockSummaryInput {
  @Field({ nullable: true, description: "주식 요약 ID" })
  @IsOptional()
  @IsNumber()
  id?: number

  @Field({ nullable: true, description: "주식 요약 이름" })
  @IsOptional()
  @IsString()
  name?: string

  @Field({ nullable: true, description: "주식 요약 정보 계좌 번호" })
  @IsOptional()
  @IsString()
  accountNumber?: string

  @Field({ nullable: true, description: "주식 요약 심볼" })
  @IsOptional()
  @IsString()
  symbol?: string

  @Field(() => CurrencyType, { nullable: true, description: "계좌 통화" })
  @IsOptional()
  @IsEnum(CurrencyType)
  currency?: CurrencyType

  @Field(() => Float, { nullable: true, description: "주식 요약 수량" })
  @IsOptional()
  @IsNumber()
  quantity?: number

  @Field(() => Float, { nullable: true, description: "주식 요약 금액" })
  @IsOptional()
  @IsNumber()
  amount?: number

  @Field(() => SummaryType, { nullable: true, description: "주식 요약 타입 (예수금 or 주식 요약)" })
  @IsOptional()
  @IsEnum(SummaryType)
  type?: SummaryType

  @Field({ nullable: true, description: "삭제 여부" })
  @IsOptional()
  @IsBoolean()
  isDelete?: boolean

  @Field({ nullable: true, description: "계좌 ID" })
  @IsOptional()
  @IsNumber()
  accountId?: number
}
