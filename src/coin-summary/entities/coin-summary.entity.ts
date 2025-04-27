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
export class CoinSummary {
  @Field({ description: "코인 요약 ID" })
  @PrimaryGeneratedColumn()
  id?: number

  @Field({ description: "코인 요약 정보 이름", nullable: true })
  @Column({ nullable: true })
  name?: string

  @Field({ description: "코인 요약 정보 계좌 번호", nullable: true })
  @Column({ nullable: true })
  accountNumber?: string

  @Field({ description: "코인 요약 정보 심볼", nullable: true })
  @Column({ nullable: true })
  @Index()
  symbol?: string

  @Field({ description: "코인 명칭", nullable: true })
  @Column({ nullable: true })
  slug?: string

  @Field(() => Float, { description: "코인 요약 정보 수량" })
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

  @Field(() => Float, { description: "코인 요약 정보 금액" })
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

  @Field(() => CurrencyType, { description: "코인 요약 정보 통화", nullable: true })
  @Column({ nullable: true })
  currency?: CurrencyType

  @Field(() => SummaryType, { description: "코인 요약 정보 타입(예수금 or 코인 요약)" })
  @Column({
    type: "enum",
    enum: SummaryType,
    default: SummaryType.CASH,
  })
  type!: SummaryType

  @Field({ description: "코인 요약 삭제 여부", nullable: true })
  @Column({
    type: "boolean",
    default: false,
  })
  isDelete?: boolean

  @Field(() => Date)
  @CreateDateColumn()
  createdAt?: Date

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt?: Date

  @Field()
  @Column()
  accountId!: number

  @ManyToOne(() => Account, (account) => account.coinSummaries, {
    lazy: true,
  })
  @JoinColumn({ name: "accountId" })
  account?: Promise<Account>
}
