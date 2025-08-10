import { registerEnumType } from "@nestjs/graphql"
import {
  UserRole,
  UserState,
  AccountType,
  CurrencyType,
  TransactionType,
  SummaryType,
} from "@prisma/client"

/**
 * Register all Prisma enums for GraphQL
 * This centralizes enum registration in one place
 */
export function registerAllEnums(): void {
  // User related enums
  registerEnumType(UserRole, {
    name: "UserRole",
    description: "사용자 권한 유형",
  })

  registerEnumType(UserState, {
    name: "UserState",
    description: "사용자 상태",
  })

  // Account related enums
  registerEnumType(AccountType, {
    name: "AccountType",
    description: "계좌 유형",
  })

  // Transaction related enums
  registerEnumType(TransactionType, {
    name: "TransactionType",
    description: "거래 유형",
  })

  // Currency enum
  registerEnumType(CurrencyType, {
    name: "CurrencyType",
    description: "통화 유형",
  })

  // Summary enum
  registerEnumType(SummaryType, {
    name: "SummaryType",
    description: "요약 유형",
  })
}