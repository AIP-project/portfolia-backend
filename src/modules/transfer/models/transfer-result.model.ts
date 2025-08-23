import { ObjectType, Field } from "@nestjs/graphql"

@ObjectType()
export class TransferTransaction {
  @Field(() => Number, { description: "트랜잭션 ID" })
  id: number

  @Field(() => Number, { description: "계좌 ID" })
  accountId: number

  @Field(() => Number, { description: "금액" })
  amount: number

  @Field(() => String, { description: "거래 유형" })
  type: string

  @Field(() => Date, { description: "거래일" })
  transactionDate: Date

  @Field(() => String, { nullable: true, description: "설명" })
  description?: string
}

@ObjectType()
export class TransferResult {
  @Field(() => Boolean, { description: "성공 여부" })
  success: boolean

  @Field(() => TransferTransaction, { description: "출금 트랜잭션" })
  fromTransaction: TransferTransaction

  @Field(() => TransferTransaction, { description: "입금 트랜잭션" })
  toTransaction: TransferTransaction

  @Field(() => String, { nullable: true, description: "메시지" })
  message?: string
}
