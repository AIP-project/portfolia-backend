import type { Type } from "@nestjs/common"
import { Field, ObjectType } from "@nestjs/graphql"
import { PageInfo } from "./page-info.model"

export interface IPaginatedType<T> {
  edges: T[]
  pageInfo: PageInfo
}

export function Paginated<T>(classRef: Type<T>): Type<IPaginatedType<T>> {
  @ObjectType(`${classRef.name}Edge`)
  abstract class EdgeType {
    @Field(() => [classRef])
    edges: T[]

    @Field(() => PageInfo)
    pageInfo: PageInfo
  }

  return EdgeType as Type<IPaginatedType<T>>
}
