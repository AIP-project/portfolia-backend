import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm"
import { Account } from "../../account/entities/account.entity"
import { Field, Float, ObjectType } from "@nestjs/graphql"
import { CurrencyType } from "../../common"

@ObjectType()
@Entity()
export class LiabilitiesSummary {
  @Field({ description: "부채 요약 ID" })
  @PrimaryGeneratedColumn()
  id?: number

  @Field(() => Float, { description: "부채 금액 총합" })
  @Column({
    type: "decimal",
    precision: 15,
    scale: 5,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  amount!: number // 부채 시작 금액

  @Field(() => Float, { description: "부채 남은 금액 총합", nullable: true })
  @Column({
    type: "decimal",
    precision: 15,
    scale: 5,
    default: 0,
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  remainingAmount?: number // 부채 남은 금액

  @Field(() => CurrencyType, { description: "부채 거래 통화", nullable: true })
  @Column({ nullable: true })
  currency?: CurrencyType

  @Field(() => Float, { description: "부채 거래 수" })
  @Column({ default: 0 })
  count: number

  @Field({ description: "대출 요약 삭제 여부", nullable: true })
  @Column({
    type: "boolean",
    default: false,
  })
  isDelete?: boolean

  @Field(() => Date)
  @CreateDateColumn()
  createdAt!: Date

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt!: Date

  @Field()
  @Column()
  accountId!: number

  @OneToOne(() => Account, (account) => account.liabilitiesSummary, {
    lazy: true,
  })
  @JoinColumn({ name: "accountId" })
  account!: Promise<Account>
}
