import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm"
import { Field, ObjectType } from "@nestjs/graphql"
import { GraphQLJSON } from "graphql-scalars"

@ObjectType()
@Entity()
export class ExchangeRate {
  @Field({ description: "환율 ID" })
  @PrimaryGeneratedColumn()
  id?: number

  @Field({ description: "환율 정보 기준 통화" })
  @Column()
  base!: string

  @Field(() => GraphQLJSON, { description: "환율 정보 환율" })
  @Column("json")
  exchangeRates!: Record<string, number>

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
