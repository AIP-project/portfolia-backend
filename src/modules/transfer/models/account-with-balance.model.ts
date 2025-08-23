import { Field, Float, ObjectType } from "@nestjs/graphql"
import { AccountType, CurrencyType } from "@prisma/client"

@ObjectType({ description: "잔액을 포함한 계좌 정보" })
export class AccountWithBalance {
  @Field({ description: "계좌 ID" })
  id!: number

  @Field({ description: "계좌 이름" })
  nickName!: string

  @Field(() => AccountType, { description: "계좌 타입" })
  type!: AccountType

  @Field(() => CurrencyType, { description: "통화 타입" })
  currency!: CurrencyType

  @Field(() => Float, { description: "현재 잔액" })
  balance!: number

  @Field({ description: "계좌 삭제 여부" })
  isDelete!: boolean
}
