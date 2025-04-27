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
import { CurrencyType, TransactionType } from "../../common"

@ObjectType()
@Entity()
export class CoinTransaction {
  @Field({ description: "코인 거래 ID" })
  @PrimaryGeneratedColumn()
  id?: number

  @Field({ description: "코인 이름", nullable: true })
  @Column({ nullable: true })
  name?: string

  @Field({ description: "코인 심볼", nullable: true })
  @Column({ nullable: true })
  symbol?: string

  @Field(() => Float, { description: "코인 수량" })
  @Column({
    type: "decimal",
    precision: 25,
    scale: 12,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  quantity!: number

  @Field(() => CurrencyType, { description: "코인 거래 통화", nullable: true })
  @Column({ nullable: true })
  currency?: CurrencyType

  @Field(() => Float, { description: "코인 금액" })
  @Column({
    type: "decimal",
    precision: 25,
    scale: 12,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  amount!: number

  @Field(() => TransactionType, { description: "거래 타입" })
  @Column({
    type: "enum",
    enum: TransactionType,
  })
  type!: TransactionType

  @Field({ description: "비고", nullable: true })
  @Column({ nullable: true })
  note?: string

  @Field(() => Date, { description: "거래 일자", nullable: true })
  @Column()
  transactionDate!: Date

  @Field({ description: "삭제 여부", nullable: true })
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

  @ManyToOne(() => Account, (account) => account.coinTransactions, {
    lazy: true,
  })
  @JoinColumn({ name: "accountId" })
  account!: Promise<Account>
}
