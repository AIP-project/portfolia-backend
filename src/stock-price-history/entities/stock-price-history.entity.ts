import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm"
import { Field, Float, ObjectType } from "@nestjs/graphql"

@ObjectType()
@Entity()
@Index(['symbol', 'id'])
export class StockPriceHistory {
  @Field({ description: "주식 가격 이력 ID" })
  @PrimaryGeneratedColumn()
  id?: number

  @Field({ description: "주식 가격 이력 정보 심볼" })
  @Column()
  @Index()
  symbol!: string

  @Field({ description: "주식 가격 이력 정보 통화", nullable: true })
  @Column({ nullable: true })
  currency?: string

  @Field(() => Float, { description: "주식 가격 이력 정보 기준가 (전일 종가)" })
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
  base!: number

  @Field(() => Float, { description: "주식 가격 이력 정보 당일 종가" })
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
  close!: number

  @Field(() => Float, { description: "주식 가격 이력 정보 거래량" })
  @Column({
    type: "decimal",
    precision: 20,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  volume!: number

  @Field({ description: "주식 가격 이력 정보 가격 변동 방향", nullable: true })
  @Column({ nullable: true })
  changeType?: string

  @Field(() => Date, { nullable: true })
  @CreateDateColumn()
  createdAt!: Date

  @Field(() => Date, { nullable: true })
  @UpdateDateColumn()
  updatedAt!: Date
}
