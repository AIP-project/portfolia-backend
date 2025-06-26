import { ArgsType, Field } from "@nestjs/graphql"
import { IsNumber, IsOptional, IsString } from "class-validator"
import { PageSearchArgs } from "../../common"
import { TransactionType } from "@prisma/client"

@ArgsType()
export class CoinTransactionsArgs extends PageSearchArgs {
  @Field(() => String, { nullable: true, description: "코인 거래 이름" })
  @IsOptional()
  @IsString()
  name?: string

  @Field(() => String, { nullable: true, description: "코인 거래 심볼" })
  @IsOptional()
  @IsString()
  symbol?: string

  @Field(() => TransactionType, { nullable: true, description: "코인 거래 타입 (입금, 출금)" })
  @IsOptional()
  type?: TransactionType

  @Field(() => String, { nullable: true, description: "코인 거래 비고" })
  @IsOptional()
  @IsString()
  note?: string

  @Field(() => String, { nullable: true, description: "조회 시작 일자" })
  @IsOptional()
  @IsString()
  fromTransactionDate?: string

  @Field(() => String, { nullable: true, description: "조회 종료 일자" })
  @IsOptional()
  @IsString()
  toTransactionDate?: string

  @Field(() => Number, { nullable: false, description: "계좌 ID" })
  @IsOptional()
  @IsNumber()
  accountId!: number
}
