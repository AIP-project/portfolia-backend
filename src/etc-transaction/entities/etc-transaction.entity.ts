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
export class EtcTransaction {
  @Field({ description: "기타 거래 ID" })
  @PrimaryGeneratedColumn()
  id?: number

  @Field({ description: "기타 거래 이름" })
  @Column()
  name!: string

  @Field(() => Float, { description: "기타 취득 당시 가격" })
  @Column({
    type: "decimal",
    precision: 15,
    scale: 5,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  purchasePrice!: number

  @Field(() => Float, { description: "기타 현재 가격", nullable: true })
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
  currentPrice?: number

  @Field({ description: "거래 기관", nullable: true })
  @Column({ nullable: true })
  operation?: string

  @Field(() => CurrencyType, { description: "기타 거래 통화", nullable: true })
  @Column({ nullable: true })
  currency?: CurrencyType

  @Field({ description: "기타 비고", nullable: true })
  @Column({ nullable: true })
  note?: string

  @Field(() => Date, { description: "거래 일자", nullable: true })
  @Column()
  transactionDate!: Date

  @Field({ description: "처리 완료 여부" })
  @Column({
    type: "boolean",
    default: false,
  })
  isComplete: boolean

  @Field({ description: "삭제 여부" })
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
