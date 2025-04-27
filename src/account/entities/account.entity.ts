import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm"
import { Field, ObjectType } from "@nestjs/graphql"
import { EtcTransaction } from "../../etc-transaction/entities"
import { CoinTransaction } from "../../coin-transaction/entities"
import { BankTransaction } from "../../bank-transaction/entities"
import { BankSummary } from "../../bank-summary/entities"
import { CoinSummary } from "../../coin-summary/entities"
import { StockSummary } from "../../stock-summary/entities"
import { AccountType, CurrencyType } from "../../common"
import { User } from "../../user/entities/user.entity"
import { LiabilitiesTransaction } from "../../liabilities-transaction/entities"
import { StockTransaction } from "../../stock-transaction/entities"
import { EtcSummary } from "../../etc-summary/entities"
import { LiabilitiesSummary } from "../../liabilities-summary/entities"

@ObjectType({ description: "계좌 기본 정보" })
@Entity()
export class Account {
  @Field({ description: "계좌 ID" })
  @PrimaryGeneratedColumn()
  id?: number

  @Field({ description: "계좌 이름" })
  @Column()
  nickName!: string

  @Field(() => AccountType, { description: "계좌 타입" })
  @Column({
    type: "enum",
    enum: AccountType,
    default: AccountType.ETC,
  })
  type!: AccountType

  @Field(() => CurrencyType, { description: "기본 통화" })
  @Column({
    type: "enum",
    enum: CurrencyType,
    default: CurrencyType.KRW,
  })
  currency!: CurrencyType

  @Field({ description: "비고", nullable: true })
  @Column({ nullable: true })
  note?: string

  @Field({ description: "계좌 삭제 여부", nullable: true })
  @Column({
    type: "boolean",
    default: false,
  })
  isDelete!: boolean

  @Field(() => Date, { description: "계좌 생성일", nullable: true })
  @CreateDateColumn()
  createdAt!: Date

  @Field(() => Date, { description: "계좌 수정일", nullable: true })
  @UpdateDateColumn()
  updatedAt!: Date

  @Field({ description: "사용자 ID", nullable: true })
  @Column()
  userId!: number

  @ManyToOne(() => User, (user) => user.accounts, {
    lazy: true,
  })
  @JoinColumn({ name: "userId" })
  user!: Promise<User>

  @OneToMany(() => BankTransaction, (bankTransaction) => bankTransaction.account, {
    lazy: true,
  })
  bankTransactions!: Promise<BankTransaction[]>

  @OneToOne(() => BankSummary, (bankSummary) => bankSummary.account, {
    lazy: true,
  })
  bankSummary!: Promise<BankSummary>

  @OneToMany(() => StockTransaction, (stockTransaction) => stockTransaction.account, {
    lazy: true,
  })
  stockTransactions!: Promise<StockTransaction[]>

  @OneToMany(() => StockSummary, (stockSummary) => stockSummary.account, {
    lazy: true,
  })
  stockSummaries!: Promise<StockSummary[]>

  @OneToMany(() => CoinTransaction, (coinTransaction) => coinTransaction.account, {
    lazy: true,
  })
  coinTransactions!: Promise<CoinTransaction[]>

  @OneToMany(() => CoinSummary, (coinSummary) => coinSummary.account, {
    lazy: true,
  })
  coinSummaries!: Promise<CoinSummary[]>

  @OneToMany(() => EtcTransaction, (etcTransaction) => etcTransaction.account, {
    lazy: true,
  })
  etcTransactions!: Promise<EtcTransaction[]>

  @OneToOne(() => EtcSummary, (etcSummary) => etcSummary.account, {
    lazy: true,
  })
  etcSummary!: Promise<EtcSummary>

  @OneToMany(() => LiabilitiesTransaction, (liabilitiesTransaction) => liabilitiesTransaction.account, {
    lazy: true,
  })
  liabilitiesTransactions!: Promise<LiabilitiesTransaction[]>

  @OneToOne(() => LiabilitiesSummary, (liabilitiesSummary) => liabilitiesSummary.account, {
    lazy: true,
  })
  liabilitiesSummary!: Promise<LiabilitiesSummary>
}
