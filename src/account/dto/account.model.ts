import { Field, ObjectType } from "@nestjs/graphql"
import { AccountType } from "@prisma/client"

@ObjectType({ description: "계좌 기본 정보" })
export class Account {
  @Field({ description: "계좌 ID" })
  id?: number

  @Field({ description: "계좌 이름" })
  nickName!: string

  @Field(() => AccountType, { description: "계좌 타입" })
  type!: AccountType

  @Field({ description: "비고", nullable: true })
  note?: string

  @Field({ description: "계좌 삭제 여부", nullable: true })
  isDelete!: boolean

  @Field(() => Date, { description: "계좌 생성일", nullable: true })
  createdAt!: Date

  @Field(() => Date, { description: "계좌 수정일", nullable: true })
  updatedAt!: Date

  @Field({ description: "사용자 ID", nullable: true })
  userId!: number
}
