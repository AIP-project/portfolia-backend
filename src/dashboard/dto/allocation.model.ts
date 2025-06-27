import { Field, Float, ObjectType } from "@nestjs/graphql"

@ObjectType({ description: "자산 보유 비율 정보" })
export class Allocation {
  @Field(() => Float, { description: "은행" })
  bank!: number

  @Field(() => Float, { description: "주식" })
  stock!: number

  @Field(() => Float, { description: "크립토" })
  coin!: number

  @Field(() => Float, { description: "기타" })
  etc!: number

  @Field(() => Float, { description: "부채" })
  liabilities!: number
}
