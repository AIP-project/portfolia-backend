import { Field, Float, InputType } from "@nestjs/graphql"
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from "class-validator"
import { CurrencyType } from "@prisma/client"

@InputType()
export class EtcTransactionInput {
  @Field({ nullable: true, description: "기타 거래 ID" })
  @IsOptional()
  @IsNumber()
  id?: number

  @Field({ nullable: true, description: "기타 거래 이름" })
  @IsOptional()
  @IsString()
  name?: string

  @Field(() => Float, { nullable: true, description: "기타 거래 구매가격" })
  @IsOptional()
  @IsNumber()
  purchasePrice?: number

  @Field(() => Float, { nullable: true, description: "기타 거래 현재가격" })
  @IsOptional()
  @IsNumber()
  currentPrice?: number

  @Field({ nullable: true, description: "기타 거래 통화" })
  @IsOptional()
  @IsEnum(CurrencyType)
  currency?: CurrencyType

  @Field({ nullable: true, description: "기타 거래 기관" })
  @IsOptional()
  @IsString()
  operation?: string

  @Field({ nullable: true, description: "기타 거래 타입" })
  @IsOptional()
  @IsString()
  note?: string

  @Field({ nullable: true, description: "거래 일자" })
  @IsOptional()
  @IsString()
  transactionDate?: string

  @Field({ nullable: true, description: "완료 여부" })
  @IsOptional()
  @IsBoolean()
  isComplete?: boolean

  @Field({ nullable: true, description: "삭제 여부" })
  @IsOptional()
  @IsBoolean()
  isDelete?: boolean

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  accountId?: number
}
