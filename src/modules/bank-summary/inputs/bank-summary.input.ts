import { Field, Float, InputType } from "@nestjs/graphql"
import { IsNumber, IsOptional, IsString } from "class-validator"
import { CurrencyType } from "@prisma/client"

@InputType()
export class BankSummaryInput {
  @Field({ nullable: true, description: "은행 요약 ID" })
  @IsOptional()
  @IsNumber()
  id?: number

  @Field({ nullable: true, description: "은행 명" })
  @IsOptional()
  @IsString()
  name?: string

  @Field(() => CurrencyType, { nullable: true, description: "통화 타입" })
  @IsOptional()
  currency?: CurrencyType

  @Field({ nullable: true, description: "은행 계좌 번호" })
  @IsOptional()
  @IsString()
  accountNumber?: string

  @Field(() => Float, { nullable: true, description: "총 입금 금액" })
  @IsOptional()
  @IsNumber()
  totalDepositAmount?: number

  @Field(() => Float, { nullable: true, description: "총 출금 금액" })
  @IsOptional()
  @IsNumber()
  totalWithdrawalAmount?: number

  @Field(() => Float, { nullable: true, description: "잔액" })
  @IsOptional()
  @IsNumber()
  balance?: number

  @Field({ nullable: true, description: "계좌 ID ( 관리자 전용 )" })
  @IsOptional()
  @IsNumber()
  accountId?: number
}
