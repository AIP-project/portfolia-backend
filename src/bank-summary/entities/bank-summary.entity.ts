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

@ObjectType()
@Entity()
export class BankSummary {
  @Field()
  @PrimaryGeneratedColumn()
  id?: number

  @Field({ description: "은행 명", nullable: true })
  @Column({ nullable: true })
  name?: string

  @Field({ description: "계좌 번호" })
  @Column()
  accountNumber!: string

  @Field(() => Float, { description: "총 입금 금액" })
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
  totalDepositAmount!: number

  @Field(() => Float, { description: "총 출금 금액" })
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
  totalWithdrawalAmount!: number

  @Field(() => Float, { description: "잔액" })
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
  balance!: number

  @Field({ description: "은행 요약 삭제 여부", nullable: true })
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

  @OneToOne(() => Account, (account) => account.bankSummary, {
    lazy: true,
  })
  @JoinColumn({ name: "accountId" })
  account!: Promise<Account>
}
