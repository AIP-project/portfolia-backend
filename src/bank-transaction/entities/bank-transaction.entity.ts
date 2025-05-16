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
import { TransactionType } from "../../common"

@ObjectType()
@Entity()
export class BankTransaction {
  @Field({ description: "은행 거래 ID" })
  @PrimaryGeneratedColumn()
  id?: number

  @Field({ description: "거래명", nullable: true })
  @Column({ nullable: true })
  name?: string

  @Field(() => Float, { description: "금액" })
  @Column({
    type: "decimal",
    precision: 20,
    scale: 3,
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
  isDelete!: boolean

  @Field(() => Date, { description: "생성일" })
  @CreateDateColumn()
  createdAt!: Date

  @Field(() => Date, { description: "수정일" })
  @UpdateDateColumn()
  updatedAt!: Date

  @Field()
  @Column()
  accountId!: number

  @ManyToOne(() => Account, (account) => account.bankTransactions, {
    lazy: true,
  })
  @JoinColumn({ name: "accountId" })
  account!: Promise<Account>
}
