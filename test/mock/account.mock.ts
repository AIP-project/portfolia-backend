import { faker } from "@faker-js/faker/locale/ko"
import { AccountType, CurrencyType, LocationType, SummaryType } from "../../src/common"
import { Account } from "../../src/account/dto/accounts.model"
import { BankSummary } from "../../src/bank-summary/dto/bank-summary.model"
import { CoinSummary } from "../../src/coin-summary/dto/coin-summaries.model"
import { StockSummary } from "../../src/stock-summary/dto/stock-summaries.model"
import { EtcSummary } from "../../src/etc-summary/dto/etc-summary.model"
import { LiabilitiesSummary } from "../../src/liabilities-summary/dto/liabilities-summary.model"
import { generateMockUser } from "./user.mock"

export const generateMockAccount = (data?: Partial<Account>): Account => {
  return {
    id: faker.number.int(),
    nickName: faker.finance.accountName(),
    type: faker.helpers.arrayElement(Object.values(AccountType)),
    location: faker.helpers.arrayElement(Object.values(LocationType)),
    currency: faker.helpers.arrayElement(Object.values(CurrencyType)),
    isDelete: false,
    userId: faker.number.int(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  }
}

export const generateMockBankSummary = (data?: Partial<BankSummary>): BankSummary => {
  return {
    id: faker.number.int(),
    name: faker.company.name(),
    balance: Number(faker.finance.amount({ min: 0, max: 10000000 })),
    currency: faker.helpers.arrayElement(Object.values(CurrencyType)),
    accountId: faker.number.int(),
    isDelete: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  }
}

export const generateMockStockSummary = (data?: Partial<StockSummary>): StockSummary => {
  return {
    id: faker.number.int(),
    name: faker.company.name(),
    symbol: faker.finance.currencyCode(),
    quantity: Number(faker.finance.amount({ min: 1, max: 1000, dec: 2 })),
    amount: Number(faker.finance.amount({ min: 10000, max: 1000000 })),
    currency: faker.helpers.arrayElement(Object.values(CurrencyType)),
    type: faker.helpers.arrayElement(Object.values(SummaryType)),
    accountId: faker.number.int(),
    isDelete: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  }
}

export const generateMockCoinSummary = (data?: Partial<CoinSummary>): CoinSummary => {
  return {
    id: faker.number.int(),
    name: faker.finance.currencyName(),
    symbol: faker.finance.currencyCode(),
    slug: faker.lorem.slug(),
    quantity: Number(faker.finance.amount({ min: 0.1, max: 100, dec: 8 })),
    amount: Number(faker.finance.amount({ min: 10000, max: 1000000 })),
    currency: faker.helpers.arrayElement(Object.values(CurrencyType)),
    type: faker.helpers.arrayElement(Object.values(SummaryType)),
    accountId: faker.number.int(),
    isDelete: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  }
}

export const generateMockEtcSummary = (data?: Partial<EtcSummary>): EtcSummary => {
  return {
    id: faker.number.int(),
    name: faker.commerce.productName(),
    purchasePrice: Number(faker.finance.amount({ min: 100000, max: 10000000 })),
    currentPrice: Number(faker.finance.amount({ min: 100000, max: 10000000 })),
    count: faker.number.int({ min: 1, max: 10 }),
    currency: faker.helpers.arrayElement(Object.values(CurrencyType)),
    accountId: faker.number.int(),
    isDelete: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  }
}

export const generateMockLiabilitiesSummary = (data?: Partial<LiabilitiesSummary>): LiabilitiesSummary => {
  const amount = Number(faker.finance.amount({ min: 10000000, max: 100000000 }))
  const remainingAmount = Number(faker.finance.amount({ min: 1000000, max: amount }))

  return {
    id: faker.number.int(),
    name: faker.finance.accountName(),
    amount: amount,
    remainingAmount: remainingAmount,
    count: faker.number.int({ min: 1, max: 100 }),
    currency: faker.helpers.arrayElement(Object.values(CurrencyType)),
    accountId: faker.number.int(),
    isDelete: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  }
}
