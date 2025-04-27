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
import { CurrencyType, SummaryType } from "../../common"

@ObjectType()
@Entity()
export class StockSummary {
  @Field({ description: "주식 요약 ID" })
  @PrimaryGeneratedColumn()
  id?: number

  @Field({ description: "주식 요약 정보 이름", nullable: true })
  @Column({ nullable: true })
  name?: string

  @Field({ description: "주식 요약 정보 계좌 번호", nullable: true })
  @Column({ nullable: true })
  accountNumber?: string

  @Field({ description: "주식 요약 정보 심볼", nullable: true })
  @Column({ nullable: true })
  @Index()
  symbol?: string

  @Field({ description: "증권사 주식 코드", nullable: true })
  @Column({ nullable: true })
  stockCompanyCode?: string

  @Field(() => Float, { description: "주식 요약 정보 수량" })
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

  @Field(() => Float, { description: "주식 요약 정보 금액" })
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
  amount!: number

  @Field(() => CurrencyType, { description: "주식 요약 정보 통화", nullable: true })
  @Column({
    type: "enum",
    enum: CurrencyType,
    nullable: true,
  })
  currency?: CurrencyType

  @Field({ description: "주식 요약 정보 소속 마켓", nullable: true })
  @Column({ nullable: true })
  market?: string

  @Field({ description: "주식 요약 정보 로고 이미지", nullable: true })
  @Column({ nullable: true })
  logoImageUrl?: string

  @Field(() => SummaryType, { description: "주식 요약 정보 타입(예수금 or 주식 요약" })
  @Column({
    type: "enum",
    enum: SummaryType,
    default: SummaryType.CASH,
  })
  type!: SummaryType

  @Field({ description: "주식 요약 삭제 여부", nullable: true })
  @Column({
    type: "boolean",
    default: false,
  })
  isDelete?: boolean

  @Field(() => Date, { nullable: true })
  @CreateDateColumn()
  createdAt?: Date

  @Field(() => Date, { nullable: true })
  @UpdateDateColumn()
  updatedAt?: Date

  @Field({ nullable: true })
  @Column()
  accountId!: number

  @ManyToOne(() => Account, (account) => account.stockSummaries, {
    lazy: true,
  })
  @JoinColumn({ name: "accountId" })
  account?: Promise<Account>
}
