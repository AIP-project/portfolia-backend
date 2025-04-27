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
export class EtcSummary {
  @Field({ nullable: true, description: "기타 요약 ID" })
  @PrimaryGeneratedColumn()
  id?: number

  @Field(() => Float, { nullable: false, description: "구매 당시 금액 총합" })
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
  purchasePrice!: number // 구매 당시 가격

  @Field(() => Float, { nullable: true, description: "현재 가격 총합" })
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
  currentPrice?: number // 현재 가격 (nullable 설정 가능)

  @Field(() => CurrencyType, { description: "기타 거래 통화", nullable: true })
  @Column({ nullable: true })
  currency?: CurrencyType

  @Field({ nullable: false, description: "기타 거래 수" })
  @Column({ default: 0 })
  count: number

  @Field({ description: "기타 요약 삭제 여부", nullable: true })
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

  @OneToOne(() => Account, (account) => account.etcSummary, {
    lazy: true,
  })
  @JoinColumn({ name: "accountId" })
  account!: Promise<Account>
}
