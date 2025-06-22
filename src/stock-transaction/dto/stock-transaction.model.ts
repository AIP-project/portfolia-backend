import { Field, Float, ObjectType } from "@nestjs/graphql"
import { CurrencyType, TransactionType } from "../../common"

@ObjectType()
export class StockTransaction {
  @Field({ description: "주식 거래 ID" })
  id?: number

  @Field(() => Date, { description: "거래 일자", nullable: true })
  transactionDate!: Date

  @Field({ description: "주식 거래 이름", nullable: true })
  name?: string

  @Field({ description: "주식 거래 심볼" })
  symbol!: string

  @Field(() => Float, { description: "주식 거래 수량" })
  quantity!: number

  @Field(() => Float, { description: "주식 거래 가격" })
  price!: number

  @Field(() => Float, { description: "주식 거래 금액" })
  amount!: number

  @Field(() => Float, { description: "주식 거래 수수료" })
  fee!: number

  @Field(() => CurrencyType, { description: "주식 거래 통화", nullable: true })
  currency?: CurrencyType

  @Field(() => TransactionType, { description: "주식 거래 타입 (입금, 출금)" })
  type!: TransactionType

  @Field({ description: "주식 거래 비고", nullable: true })
  note?: string

  @Field({ description: "주식 거래 삭제 여부", nullable: true })
  isDelete?: boolean

  @Field(() => Date, { description: "주식 거래 생성일", nullable: true })
  createdAt!: Date

  @Field(() => Date, { description: "주식 거래 수정일", nullable: true })
  updatedAt!: Date

  @Field({ description: "계좌 ID", nullable: true })
  accountId!: number
}