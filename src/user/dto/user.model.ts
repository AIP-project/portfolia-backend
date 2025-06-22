import { ObjectType, Field, ID } from "@nestjs/graphql"
import { CurrencyType, UserRole } from "../../common"
import { UserState } from "../../common/enum/user-state.enum"

@ObjectType({ description: "사용자 정보" })
export class User {
  @Field(() => ID, { description: "아이디" })
  id?: number

  @Field({ description: "이름" })
  name!: string

  @Field({ description: "비밀번호", nullable: true })
  password?: string

  @Field({ description: "이메일" })
  email!: string

  @Field({ description: "전화번호", nullable: true })
  phone?: string

  @Field({ description: "프로필 이미지", nullable: true })
  profileImg?: string

  @Field(() => UserRole, { description: "역할", nullable: true })
  role!: UserRole

  @Field(() => CurrencyType, { description: "기본 통화", nullable: true })
  currency!: CurrencyType

  @Field(() => UserState, { description: "회원 상태", nullable: true })
  state!: UserState

  @Field(() => Date, { nullable: true })
  createdAt!: Date

  @Field(() => Date, { nullable: true })
  updatedAt!: Date
}
