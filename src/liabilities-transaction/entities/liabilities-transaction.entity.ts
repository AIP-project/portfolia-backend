import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm"
import { Account } from "../../account/entities/account.entity"
import { Field, Float, ObjectType } from "@nestjs/graphql"
import { CurrencyType } from "../../common"

@ObjectType()
@Entity()
export class LiabilitiesTransaction {
  @Field({ description: "부채 거래 ID" })
  @PrimaryGeneratedColumn()
  id?: number

  @Field({ description: "부채 거래 이름" })
  @Column()
  name!: string

  @Field(() => Float, { description: "부채 거래 금액" })
  @Column({ type: "decimal", precision: 15, scale: 5, default: 0 })
  amount!: number // 부채 시작 금액

  @Field(() => Float, { description: "부채 남은 금액", nullable: true })
  @Column({ type: "decimal", precision: 15, scale: 5, default: 0, nullable: true })
  remainingAmount?: number // 부채 남은 금액

  @Field(() => Float, { description: "이율", nullable: true })
  @Column({ type: "decimal", precision: 15, scale: 5, default: 0 })
  rate!: number // 이율

  @Field({ description: "연이율 여부", nullable: true })
  @Column({
    type: "boolean",
    default: true,
  })
  isYearly: boolean

  @Field({ description: "거래 기관", nullable: true })
  @Column({ nullable: true })
  operation?: string

  @Field(() => CurrencyType, { description: "기타 거래 통화", nullable: true })
  @Column({ nullable: true })
  currency?: CurrencyType

  @Field({ description: "비고", nullable: true })
  @Column({ nullable: true })
  note?: string

  @Field(() => Date, { description: "거래 일자", nullable: false })
  @Column()
  transactionDate!: Date

  @Field(() => Date, { description: "상환 일자", nullable: true })
  @Column({ nullable: true })
  repaymentDate?: Date

  @Field({ description: "거래 완료 여부", nullable: true })
  @Column({
    type: "boolean",
    default: false,
  })
  isComplete: boolean

  @Field({ description: "거래 삭제 여부", nullable: true })
  @Column({
    type: "boolean",
    default: false,
  })
  isDelete: boolean

  @Field(() => Date)
  @CreateDateColumn()
  createdAt!: Date

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt!: Date

  @Field()
  @Column()
  accountId!: number

  @ManyToOne(() => Account, (account) => account.etcTransactions, {
    lazy: true,
  })
  @JoinColumn({ name: "accountId" })
  account!: Promise<Account>
}
