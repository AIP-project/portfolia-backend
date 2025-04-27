import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm"
import { Account } from "../../account/entities/account.entity"
import { CurrencyType, UserRole } from "../../common"
import { Field, ID, ObjectType } from "@nestjs/graphql"
import { UserState } from "../../common/enum/user-state.enum"

@ObjectType({ description: "사용자 정보" })
@Entity()
@Unique(["email"])
export class User {
  @Field(() => ID, { description: "아이디" })
  @PrimaryGeneratedColumn()
  id?: number

  @Field({ description: "이름" })
  @Column()
  name!: string

  @Field({ description: "비밀번호", nullable: true })
  @Column({ nullable: true })
  password?: string

  @Field({ description: "이메일" })
  @Column()
  email!: string

  @Field({ description: "전화번호", nullable: true })
  @Column({ nullable: true })
  phone?: string

  @Field({ description: "프로필 이미지", nullable: true })
  @Column({ nullable: true })
  profileImg?: string

  @Field(() => UserRole, { description: "역할", nullable: true })
  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.USER,
  })
  role!: UserRole

  @Field(() => CurrencyType, { description: "기본 통화", nullable: true })
  @Column({
    type: "enum",
    enum: CurrencyType,
    default: CurrencyType.KRW,
  })
  currency!: CurrencyType

  @Field(() => UserState, { description: "회원 상태", nullable: true })
  @Column({
    type: "enum",
    enum: UserState,
    default: UserState.ACTIVE,
  })
  state!: UserState

  @Field(() => Date, { nullable: true })
  @CreateDateColumn()
  createdAt!: Date

  @Field(() => Date, { nullable: true })
  @UpdateDateColumn()
  updatedAt!: Date

  @OneToMany(() => Account, (account) => account.user)
  accounts?: Account[]
}
