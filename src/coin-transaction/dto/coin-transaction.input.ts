import { Field, Float, InputType } from "@nestjs/graphql"
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from "class-validator"
import { CurrencyType, TransactionType } from "@prisma/client"

@InputType()
export class CoinTransactionInput {
  @Field({ description: "코인 거래 ID", nullable: true })
  @IsOptional()
  @IsNumber()
  id?: number

  @Field({ description: "코인 이름", nullable: true })
  @IsOptional()
  @IsString()
  name?: string

  @Field({ description: "코인 심볼", nullable: true })
  @IsOptional()
  @IsString()
  symbol?: string

  @Field({ description: "코인 유니크 키", nullable: true })
  @IsOptional()
  @IsString()
  slug?: string

  @Field(() => Float, { description: "코인 수량", nullable: true })
  @IsOptional()
  @IsNumber()
  quantity?: number

  @Field({ nullable: true, description: "코인 거래 통화" })
  @IsOptional()
  @IsEnum(CurrencyType)
  currency?: CurrencyType

  @Field(() => Float, { description: "코인 금액", nullable: true })
  @IsOptional()
  @IsNumber()
  amount?: number

  @Field(() => TransactionType, { description: "거래 타입", nullable: true })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType

  @Field({ description: "비고", nullable: true })
  @IsOptional()
  @IsString()
  note?: string

  @Field({ description: "거래일", nullable: true })
  @IsOptional()
  @IsString()
  transactionDate?: string

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isDelete?: boolean

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  accountId?: number
}
