import { Field, Float, InputType } from "@nestjs/graphql"
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from "class-validator"
import { TransactionType } from "@prisma/client"

@InputType()
export class BankTransactionInput {
  @Field({ nullable: true, description: "은행 거래 ID" })
  @IsOptional()
  @IsNumber()
  id?: number

  @Field({ nullable: true, description: "은행 거래 명" })
  @IsOptional()
  @IsString()
  name?: string

  @Field(() => Float, { nullable: true, description: "거래 금액" })
  @IsOptional()
  @IsNumber()
  amount?: number

  @Field(() => TransactionType, { nullable: true, description: "거래 타입 (입금/출금)" })
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

  @Field({ nullable: true, description: "거래 완료 여부" })
  @IsOptional()
  @IsBoolean()
  isDelete?: boolean

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  accountId?: number
}
