import { Field, Float, InputType } from "@nestjs/graphql"
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from "class-validator"
import { CurrencyType } from "@prisma/client"

@InputType()
export class LiabilitiesTransactionInput {
  @Field({ nullable: true, description: "부채 거래 ID" })
  @IsOptional()
  @IsNumber()
  id?: number

  @Field({ nullable: true, description: "부채 이름" })
  @IsOptional()
  @IsString()
  name?: string

  @Field(() => Float, { nullable: true, description: "부채 금액" })
  @IsOptional()
  @IsNumber()
  amount?: number

  @Field(() => Float, { nullable: true, description: "부채 잔액" })
  @IsOptional()
  @IsNumber()
  remainingAmount?: number

  @Field(() => Float, { nullable: true, description: "금리" })
  @IsOptional()
  @IsNumber()
  rate?: number

  @Field({ nullable: true, description: "부채 거래 통화" })
  @IsOptional()
  @IsEnum(CurrencyType)
  currency?: CurrencyType

  @Field({ nullable: true, description: "부채 거래 기관" })
  @IsOptional()
  @IsString()
  operation?: string

  @Field({ nullable: true, description: "연이율 여부" })
  @IsOptional()
  @IsBoolean()
  isYearly?: boolean

  @Field({ nullable: true, description: "비고" })
  @IsOptional()
  @IsString()
  note?: string

  @Field({ nullable: true, description: "거래 날짜" })
  @IsOptional()
  @IsString()
  transactionDate?: string

  @Field({ nullable: true, description: "상환 날짜" })
  @IsOptional()
  @IsString()
  repaymentDate?: string

  @Field({ nullable: true, description: "거래 완료 여부" })
  @IsOptional()
  @IsBoolean()
  isComplete?: boolean

  @Field({ nullable: true, description: "부채 삭제 여부" })
  @IsOptional()
  @IsBoolean()
  isDelete?: boolean

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  accountId?: number
}
