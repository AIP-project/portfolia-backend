import { Field, InputType } from "@nestjs/graphql"
import { CurrencyType } from "@prisma/client"

@InputType({ description: "통화별 계좌 조회 입력" })
export class AccountsByCurrencyInput {
  @Field(() => CurrencyType, { description: "조회할 통화 타입" })
  currency!: CurrencyType
}
