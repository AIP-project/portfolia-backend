import { Decimal } from "@prisma/client/runtime/library"

/**
 * Prisma Decimal을 number로 변환하는 유틸리티 함수
 */
export function toNumber(value: Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  return Number(value.toString())
}

/**
 * number를 Prisma Decimal로 변환하는 유틸리티 함수
 */
export function toDecimal(value: number | string | Decimal | null | undefined): Decimal {
  if (value === null || value === undefined) return new Decimal(0)
  if (value instanceof Decimal) return value
  return new Decimal(value)
}

/**
 * Prisma 객체의 Decimal 필드들을 number로 변환하는 유틸리티 함수
 */
export function transformDecimalFields<T extends Record<string, any>>(
  obj: T,
  decimalFields: (keyof T)[]
): T & { [K in keyof T]: T[K] extends Decimal ? number : T[K] } {
  const result = { ...obj } as any
  
  decimalFields.forEach(field => {
    if (result[field] instanceof Decimal) {
      result[field] = toNumber(result[field])
    }
  })
  
  return result
}