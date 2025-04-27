import { faker } from "@faker-js/faker/locale/ko"
import { AccountType, CurrencyType, LocationType, SummaryType } from "../../src/common"
import { Account } from "../../src/account/entities/account.entity"
import { BankSummary } from "../../src/bank-summary/entities"
import { CoinSummary } from "../../src/coin-summary/entities"
import { StockSummary } from "../../src/stock-summary/entities"
import { EtcSummary } from "../../src/etc-transaction/entities"
import { LiabilitiesSummary } from "../../src/liabilities-transaction/entities"
import { generateMockUser } from "./user.mock"

export const generateMockAccount = (data?: Partial<Account>): Account => {
  return {
    id: faker.number.int(),
    name: faker.finance.accountName(),
    type: faker.helpers.arrayElement(Object.values(AccountType)),
    location: faker.helpers.arrayElement(Object.values(LocationType)),
    currency: faker.helpers.arrayElement(Object.values(CurrencyType)),
    isDelete: false,
    userId: faker.number.int(),
    createdAt: new Date(),
    updatedAt: new Date(),
    // Lazy loaded relations are defined as promises
    user: Promise.resolve(generateMockUser()),
    bankTransactions: Promise.resolve([]),
    bankSummary: Promise.resolve(null),
    stockTransactions: Promise.resolve([]),
    stockSummaries: Promise.resolve([]),
    coinTransactions: Promise.resolve([]),
    coinSummaries: Promise.resolve([]),
    etcTransactions: Promise.resolve([]),
    etcSummary: Promise.resolve(null),
    liabilitiesTransactions: Promise.resolve([]),
    liabilitiesSummary: Promise.resolve(null),
    ...data,
  }
}

export const generateMockBankSummary = (data?: Partial<BankSummary>): BankSummary => {
  return {
    id: faker.number.int(),
    bankCode: faker.finance.accountNumber(),
    bankName: faker.company.name(),
    accountNumber: faker.finance.accountNumber(),
    totalDepositAmount: Number(faker.finance.amount({ min: 1000000, max: 10000000 })),
    totalWithdrawalAmount: Number(faker.finance.amount({ min: 0, max: 1000000 })),
    balance: Number(faker.finance.amount({ min: 0, max: 10000000 })),
    accountId: faker.number.int(),
    createdAt: new Date(),
    updatedAt: new Date(),
    account: Promise.resolve(null),
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
    type: faker.helpers.arrayElement(Object.values(SummaryType)),
    accountId: faker.number.int(),
    createdAt: new Date(),
    updatedAt: new Date(),
    account: Promise.resolve(null),
    ...data,
  }
}

export const generateMockCoinSummary = (data?: Partial<CoinSummary>): CoinSummary => {
  return {
    id: faker.number.int(),
    name: faker.finance.currencyName(),
    symbol: faker.finance.currencyCode(),
    quantity: Number(faker.finance.amount({ min: 0.1, max: 100, dec: 8 })),
    amount: Number(faker.finance.amount({ min: 10000, max: 1000000 })),
    type: faker.helpers.arrayElement(Object.values(SummaryType)),
    accountId: faker.number.int(),
    createdAt: new Date(),
    updatedAt: new Date(),
    account: Promise.resolve(null),
    ...data,
  }
}

export const generateMockEtcSummary = (data?: Partial<EtcSummary>): EtcSummary => {
  return {
    id: faker.number.int(),
    purchasePrice: Number(faker.finance.amount({ min: 100000, max: 10000000 })),
    currentPrice: Number(faker.finance.amount({ min: 100000, max: 10000000 })),
    count: faker.number.int({ min: 1, max: 10 }),
    accountId: faker.number.int(),
    createdAt: new Date(),
    updatedAt: new Date(),
    account: Promise.resolve(null),
    ...data,
  }
}

export const generateMockLiabilitiesSummary = (data?: Partial<LiabilitiesSummary>): LiabilitiesSummary => {
  const amount = Number(faker.finance.amount({ min: 10000000, max: 100000000 }))
  const remainingAmount = Number(faker.finance.amount({ min: 1000000, max: amount }))

  return {
    id: faker.number.int(),
    amount: amount,
    remainingAmount: remainingAmount,
    count: faker.number.int({ min: 1, max: 100 }),
    accountId: faker.number.int(),
    createdAt: new Date(),
    updatedAt: new Date(),
    account: Promise.resolve(null),
    ...data,
  }
}
