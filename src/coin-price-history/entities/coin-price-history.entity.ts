import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm"
import { Field, Float, ObjectType } from "@nestjs/graphql"

@ObjectType()
@Entity()
export class CoinPriceHistory {
  @Field({ description: "코인 가격 이력 ID" })
  @PrimaryGeneratedColumn()
  id?: number

  @Field({ description: "코인 가격 이력 정보 심볼" })
  @Column()
  @Index()
  symbol!: string

  @Field({ description: "코인 가격 이력 정보 통화", nullable: true })
  @Column({ nullable: true })
  currency?: string

  @Field(() => Float, { description: "코인 가격 이력 정보 현재가" })
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
  price!: number

  @Field(() => Float, { description: "코인 가격 이력 정보 시총" })
  @Column({
    type: "decimal",
    precision: 25,
    scale: 12,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
    nullable: true,
  })
  marketCap?: number

  @Field(() => Float, { description: "코인 가격 이력 정보 24시간 거래량" })
  @Column({
    type: "decimal",
    precision: 25,
    scale: 12,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
    nullable: true,
  })
  volumeChange24h?: number

  @Field(() => String, { description: "코인 정보 업데이트 일자", nullable: true })
  @Column({ type: "timestamp", nullable: true })
  lastUpdated?: Date

  @Field(() => Date, { nullable: true })
  @CreateDateColumn()
  createdAt!: Date

  @Field(() => Date, { nullable: true })
  @UpdateDateColumn()
  updatedAt!: Date
}
