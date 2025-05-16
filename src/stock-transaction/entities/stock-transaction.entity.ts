import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
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
export class StockTransaction {
  @Field({ description: "주식 거래 ID" })
  @PrimaryGeneratedColumn()
  id?: number

  @Field({ description: "주식 거래 이름", nullable: true })
  @Column({ nullable: true })
  name?: string

  @Field({ description: "주식 거래 심볼" })
  @Column({
    transformer: {
      to: (value: string) => value?.toUpperCase(),
      from: (value: string) => value?.toUpperCase(),
    },
  })
  @Index()
  symbol!: string

  @Field(() => Float, { description: "주식 거래 수량" })
  @Column({
    type: "decimal",
    precision: 20,
    scale: 10,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  quantity!: number

  @Field(() => CurrencyType, { description: "주식 거래 통화", nullable: true })
  @Column({ nullable: true })
  currency?: CurrencyType

  @Field(() => Float, { description: "주식 거래 금액" })
  @Column({
    type: "decimal",
    precision: 20,
    scale: 10,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  amount!: number

  @Field(() => TransactionType, { description: "주식 거래 타입 (입금, 출금)" })
  @Column({
    type: "enum",
    enum: TransactionType,
  })
  type!: TransactionType

  @Field({ description: "주식 거래 비고", nullable: true })
  @Column({ nullable: true })
  note?: string

  @Field(() => Date, { description: "거래 일자", nullable: true })
  @Column()
  transactionDate!: Date

  @Field({ description: "주식 거래 삭제 여부", nullable: true })
  @Column({
    type: "boolean",
    default: false,
  })
  isDelete?: boolean

  @Field(() => Date, { description: "주식 거래 생성일", nullable: true })
  @CreateDateColumn()
  createdAt!: Date

  @Field(() => Date, { description: "주식 거래 수정일", nullable: true })
  @UpdateDateColumn()
  updatedAt!: Date

  @Field({ description: "계좌 ID", nullable: true })
  @Column()
  accountId!: number

  @ManyToOne(() => Account, (account) => account.stockTransactions, {
    lazy: true,
  })
  @JoinColumn({ name: "accountId" })
  account!: Promise<Account>
}
