import { Injectable, Logger } from "@nestjs/common"
import { PrismaService } from "../common/prisma"
import { addAmount, JwtPayload } from "src/common"
import { AccountType, Prisma, SummaryType } from "@prisma/client"
import { DashboardDetailItem, DashboardItem } from "./dto"

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name)

  constructor(private readonly prisma: PrismaService) {}

  async dashboard(jwtPayload: JwtPayload) {
    // 각 summary 조회 쿼리
    const coinSummary = await this.prisma.coinSummary.findMany({
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
      include: { account: true },
    })

    const stockSummary = await this.prisma.stockSummary.findMany({
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
      include: { account: true },
    })

    const bankSummary = await this.prisma.bankSummary.findMany({
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
      include: { account: true },
    })

    const etcTransactions = await this.prisma.etcTransaction.findMany({
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
      include: { account: true },
    })

    const liabilitiesTransactions = await this.prisma.liabilitiesTransaction.findMany({
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
      include: { account: true },
    })

    const assets: DashboardItem[] = []
    const liabilities: DashboardItem[] = []
    const cash: DashboardItem[] = []
    const details: DashboardDetailItem[] = []

    // 총합 계산을 위한 변수
    let assetTotalAmount = 0
    let liabilitiesTotalAmount = 0
    let cashTotalAmount = 0

    const exchangeRateOne = await this.prisma.exchangeRate.findFirst({
      orderBy: { createdAt: "desc" },
    })
    if (!exchangeRateOne)
      return {
        asset: [],
        liabilities: [],
        cash: [],
        assetTotalAmount: 0,
        liabilitiesTotalAmount: 0,
        cashTotalAmount: 0,
        details: [],
      }

    const exchangeRate = exchangeRateOne.exchangeRates as Record<string, number>

    const defaultCurrencyRate = exchangeRate[jwtPayload.currency]

    const coinSymbols = coinSummary
      .filter((summary) => summary.type === SummaryType.SUMMARY)
      .map((summary) => summary.symbol)
      .filter(Boolean)

    let coinPriceHistories: any[] = []

    if (coinSymbols.length > 0) {
      coinPriceHistories = await this.prisma.$queryRaw`
        SELECT cph1.symbol, cph1.price, cph1.currency
        FROM coin_price_history cph1
               INNER JOIN (SELECT symbol, MAX(createdAt) as max_created_at
                           FROM coin_price_history
                           WHERE symbol IN (${Prisma.join(coinSymbols)})
                           GROUP BY symbol) cph2 ON cph1.symbol = cph2.symbol AND cph1.createdAt = cph2.max_created_at
      `
    }

    for (const summary of coinSummary) {
      const accountName = summary.account.nickName

      const currentPrice = coinPriceHistories.find((cph) => cph.symbol === summary.symbol)

      if (!currentPrice && summary.type !== SummaryType.CASH) {
        console.warn(`⚠️ ${summary.symbol} 코인의 현재 가격을 찾을 수 없습니다.`)
        continue
      }

      let amountInDefaultCurrency: number

      if (summary.type === SummaryType.CASH) {
        const summaryCurrencyRate = summary.currency ? exchangeRate[summary.currency] : 1
        if (!summaryCurrencyRate) {
          console.warn(`⚠️ ${summary.currency}의 환율을 찾을 수 없습니다.`)
          continue
        }
        const crossRate = defaultCurrencyRate / summaryCurrencyRate
        amountInDefaultCurrency = Number(summary.amount) * crossRate

        const existingCash = cash.find((s) => s.accountId === summary.accountId)
        if (existingCash) {
          existingCash.amount = addAmount(existingCash.amount, amountInDefaultCurrency)
        } else {
          cash.push({
            accountId: summary.accountId,
            name: accountName,
            amount: amountInDefaultCurrency,
            type: AccountType.COIN,
          })
        }
        cashTotalAmount = addAmount(cashTotalAmount, amountInDefaultCurrency)

        details.push({
          accountId: summary.accountId,
          name: `${accountName} (Cash)`,
          currency: summary.currency,
          purchaseAmount: 0,
          currentValue: Number(summary.amount),
          currentValueInDefaultCurrency: amountInDefaultCurrency,
          unrealizedPnL: 0,
          unrealizedPnLInDefaultCurrency: 0,
          unrealizedPnLPercentage: 0,
        })
      } else {
        const coinValueInUSD = Number(summary.quantity) * Number(currentPrice.price)
        const coinPriceCurrencyRate = currentPrice.currency ? exchangeRate[currentPrice.currency] : 1
        const crossRate = defaultCurrencyRate / coinPriceCurrencyRate
        amountInDefaultCurrency = coinValueInUSD * crossRate

        const existingSummary = assets.find((s) => s.accountId === summary.accountId)
        if (existingSummary) {
          existingSummary.amount = addAmount(existingSummary.amount, amountInDefaultCurrency)
        } else {
          assets.push({
            accountId: summary.accountId,
            name: accountName,
            amount: amountInDefaultCurrency,
            type: AccountType.COIN,
          })
        }
        assetTotalAmount = addAmount(assetTotalAmount, amountInDefaultCurrency)

        const summaryCurrencyRate = summary.currency ? exchangeRate[summary.currency] : 1
        const crossRateInSummaryCurrency = summaryCurrencyRate / coinPriceCurrencyRate
        const coinValueInSummaryCurrency = coinValueInUSD * crossRateInSummaryCurrency
        const unrealizedPnL = coinValueInSummaryCurrency - Number(summary.amount)
        const summaryToDefaultCurrencyRate = defaultCurrencyRate / summaryCurrencyRate
        const unrealizedPnLInDefaultCurrency = unrealizedPnL * summaryToDefaultCurrencyRate
        const unrealizedPnLPercentage = unrealizedPnLInDefaultCurrency
          ? (unrealizedPnLInDefaultCurrency / Number(summary.amount)) * 100
          : 0

        details.push({
          accountId: summary.accountId,
          name: summary.name,
          currency: summary.currency,
          purchaseAmount: Number(summary.amount),
          currentValue: coinValueInSummaryCurrency,
          currentValueInDefaultCurrency: amountInDefaultCurrency,
          unrealizedPnL: unrealizedPnL,
          unrealizedPnLInDefaultCurrency: unrealizedPnLInDefaultCurrency,
          unrealizedPnLPercentage: unrealizedPnLPercentage,
        })
      }
    }

    const stockSymbols = stockSummary
      .filter((summary) => summary.type === SummaryType.SUMMARY)
      .map((summary) => summary.symbol)
      .filter(Boolean)

    let stockPriceHistories: any[] = []

    if (stockSymbols.length > 0) {
      stockPriceHistories = await this.prisma.$queryRaw`
        SELECT sph1.symbol, sph1.base, sph1.currency
        FROM stock_price_history sph1
               INNER JOIN (SELECT symbol, MAX(createdAt) as max_created_at
                           FROM stock_price_history
                           WHERE symbol IN (${Prisma.join(stockSymbols)})
                           GROUP BY symbol) sph2 ON sph1.symbol = sph2.symbol AND sph1.createdAt = sph2.max_created_at
      `
    }

    for (const summary of stockSummary) {
      const accountName = summary.account.nickName

      const currentPrice = stockPriceHistories.find((sph) => sph.symbol === summary.symbol)

      if (!currentPrice && summary.type !== SummaryType.CASH) {
        console.warn(`⚠️ ${summary.symbol} 주식의 현재 가격을 찾을 수 없습니다.`)
        continue
      }

      let amountInDefaultCurrency: number

      if (summary.type === SummaryType.CASH) {
        const summaryCurrencyRate = summary.currency ? exchangeRate[summary.currency] : 1
        if (!summaryCurrencyRate) {
          console.warn(`⚠️ ${summary.currency}의 환율을 찾을 수 없습니다.`)
          continue
        }

        const crossRate = defaultCurrencyRate / summaryCurrencyRate
        amountInDefaultCurrency = Number(summary.amount) * crossRate

        const existingCash = cash.find((s) => s.accountId === summary.accountId)
        if (existingCash) {
          existingCash.amount = addAmount(existingCash.amount, amountInDefaultCurrency)
        } else {
          cash.push({
            accountId: summary.accountId,
            name: accountName,
            amount: amountInDefaultCurrency,
            type: AccountType.STOCK,
          })
        }
        cashTotalAmount = addAmount(cashTotalAmount, amountInDefaultCurrency)

        details.push({
          accountId: summary.accountId,
          name: `${accountName} (Cash)`,
          currency: summary.currency,
          purchaseAmount: 0,
          currentValue: Number(summary.amount),
          currentValueInDefaultCurrency: amountInDefaultCurrency,
          unrealizedPnL: 0,
          unrealizedPnLInDefaultCurrency: 0,
          unrealizedPnLPercentage: 0,
        })
      } else {
        const stockValue = Number(summary.quantity) * Number(currentPrice.base)
        const currentPriceCurrencyRate = currentPrice.currency ? exchangeRate[currentPrice.currency] : 1
        const crossRate = defaultCurrencyRate / currentPriceCurrencyRate
        amountInDefaultCurrency = stockValue * crossRate

        const existingSummary = assets.find((s) => s.accountId === summary.accountId)
        if (existingSummary) {
          existingSummary.amount = addAmount(existingSummary.amount, amountInDefaultCurrency)
        } else {
          assets.push({
            accountId: summary.accountId,
            name: accountName,
            amount: amountInDefaultCurrency,
            type: AccountType.STOCK,
          })
        }
        assetTotalAmount = addAmount(assetTotalAmount, amountInDefaultCurrency)

        const summaryCurrencyRate = summary.currency ? exchangeRate[summary.currency] : 1
        const crossRateInSummaryCurrency =
          summaryCurrencyRate / currentPriceCurrencyRate
        const stockValueInSummaryCurrency =
          Number(summary.quantity) * Number(currentPrice.base) * crossRateInSummaryCurrency
        const unrealizedPnL = stockValueInSummaryCurrency - Number(summary.amount)
        const summaryToDefaultCurrencyRate = defaultCurrencyRate / summaryCurrencyRate
        const unrealizedPnLInDefaultCurrency = unrealizedPnL * summaryToDefaultCurrencyRate
        const unrealizedPnLPercentage = unrealizedPnLInDefaultCurrency
          ? (unrealizedPnLInDefaultCurrency / Number(summary.amount)) * 100
          : 0

        details.push({
          accountId: summary.accountId,
          name: summary.name,
          currency: summary.currency,
          purchaseAmount: Number(summary.amount),
          currentValue: stockValueInSummaryCurrency,
          currentValueInDefaultCurrency: amountInDefaultCurrency,
          unrealizedPnL: unrealizedPnL,
          unrealizedPnLInDefaultCurrency: unrealizedPnLInDefaultCurrency,
          unrealizedPnLPercentage: unrealizedPnLPercentage,
        })
      }
    }

    for (const summary of bankSummary) {
      const accountName = summary.account.nickName
      const summaryCurrencyRate = summary.currency ? exchangeRate[summary.currency] : 1
      if (!summaryCurrencyRate) {
        console.warn(`⚠️ ${summary.currency}의 환율을 찾을 수 없습니다.`)
        continue
      }

      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      const amountInDefaultCurrency = Number(summary.balance) * crossRate

      const existingCash = cash.find((s) => s.accountId === summary.accountId)
      if (existingCash) {
        existingCash.amount = addAmount(existingCash.amount, amountInDefaultCurrency)
      } else {
        cash.push({
          accountId: summary.accountId,
          name: accountName,
          amount: amountInDefaultCurrency,
          type: AccountType.BANK,
        })
      }
      cashTotalAmount = addAmount(cashTotalAmount, amountInDefaultCurrency)

      details.push({
        accountId: summary.accountId,
        name: `${accountName} (Cash)`,
        currency: summary.currency,
        purchaseAmount: 0,
        currentValue: Number(summary.balance),
        currentValueInDefaultCurrency: amountInDefaultCurrency,
        unrealizedPnL: 0,
        unrealizedPnLInDefaultCurrency: 0,
        unrealizedPnLPercentage: 0,
      })
    }

    for (const transaction of etcTransactions) {
      const accountName = transaction.account.nickName
      const transactionCurrencyRate = transaction.currency ? exchangeRate[transaction.currency] : 1
      if (!transactionCurrencyRate) {
        console.warn(`⚠️ ${transaction.currency}의 환율을 찾을 수 없습니다.`)
        continue
      }
      const crossRate = defaultCurrencyRate / transactionCurrencyRate
      const amountInDefaultCurrency =
        (Number(transaction.currentPrice) || Number(transaction.purchasePrice)) * crossRate

      const existingSummary = assets.find((s) => s.accountId === transaction.accountId)
      if (existingSummary) {
        existingSummary.amount = addAmount(existingSummary.amount, amountInDefaultCurrency)
      } else {
        assets.push({
          accountId: transaction.accountId,
          name: accountName,
          amount: amountInDefaultCurrency,
          type: AccountType.ETC,
        })
      }
      assetTotalAmount = addAmount(assetTotalAmount, amountInDefaultCurrency)

      details.push({
        accountId: transaction.accountId,
        name: transaction.name,
        currency: transaction.currency,
        purchaseAmount: Number(transaction.purchasePrice),
        currentValue: Number(transaction.currentPrice),
        currentValueInDefaultCurrency: amountInDefaultCurrency,
        unrealizedPnL: Number(transaction.currentPrice) - Number(transaction.purchasePrice),
        unrealizedPnLInDefaultCurrency: amountInDefaultCurrency - Number(transaction.purchasePrice) * crossRate,
        unrealizedPnLPercentage:
          ((amountInDefaultCurrency - Number(transaction.purchasePrice) * crossRate) /
            (Number(transaction.purchasePrice) * crossRate)) *
          100,
      })
    }

    for (const transaction of liabilitiesTransactions) {
      const accountName = transaction.account.nickName
      const transactionCurrencyRate = transaction.currency ? exchangeRate[transaction.currency] : 1
      if (!transactionCurrencyRate) {
        console.warn(`⚠️ ${transaction.currency}의 환율을 찾을 수 없습니다.`)
        continue
      }
      const crossRate = defaultCurrencyRate / transactionCurrencyRate
      const amountInDefaultCurrency = (Number(transaction.remainingAmount) || Number(transaction.amount)) * crossRate

      const existingSummary = liabilities.find((s) => s.accountId === transaction.accountId)
      if (existingSummary) {
        existingSummary.amount = addAmount(existingSummary.amount, amountInDefaultCurrency)
      } else {
        liabilities.push({
          accountId: transaction.accountId,
          name: accountName,
          amount: amountInDefaultCurrency,
          type: AccountType.LIABILITIES,
        })
      }
      liabilitiesTotalAmount = addAmount(liabilitiesTotalAmount, amountInDefaultCurrency)

      details.push({
        accountId: transaction.accountId,
        name: transaction.name,
        currency: transaction.currency,
        purchaseAmount: Number(transaction.amount),
        currentValue: Number(transaction.remainingAmount),
        currentValueInDefaultCurrency: -amountInDefaultCurrency,
        unrealizedPnL: 0,
        unrealizedPnLInDefaultCurrency: 0,
        unrealizedPnLPercentage: 0,
      })
    }

    return {
      asset: assets,
      liabilities: liabilities,
      cash: cash,
      assetTotalAmount: assetTotalAmount,
      liabilitiesTotalAmount: liabilitiesTotalAmount,
      cashTotalAmount: cashTotalAmount,
      details: details,
    }
  }

  async allocation(jwtPayload: JwtPayload) {
    const bankSummary = await this.prisma.bankSummary.findMany({
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
    })
    const stockSummary = await this.prisma.stockSummary.findMany({
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
    })
    const coinSummary = await this.prisma.coinSummary.findMany({
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
    })
    const etcSummary = await this.prisma.etcSummary.findMany({
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
    })
    const liabilitiesSummary = await this.prisma.liabilitiesSummary.findMany({
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
    })

    const exchangeRateOne = await this.prisma.exchangeRate.findFirst({
      orderBy: { createdAt: "desc" },
    })
    if (!exchangeRateOne) return null

    const exchangeRate = exchangeRateOne.exchangeRates as Record<string, number>

    const defaultCurrencyRate = exchangeRate[jwtPayload.currency]

    const totalBank = bankSummary.reduce((acc, summary) => {
      let summaryCurrencyRate: number
      if (summary.currency) summaryCurrencyRate = exchangeRate[summary.currency]
      else summaryCurrencyRate = 1
      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      return addAmount(acc, Number(summary.balance) * crossRate)
    }, 0)
    const totalStock = stockSummary.reduce((acc, summary) => {
      let summaryCurrencyRate: number
      if (summary.currency) summaryCurrencyRate = exchangeRate[summary.currency]
      else summaryCurrencyRate = 1
      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      return addAmount(acc, Number(summary.amount) * crossRate)
    }, 0)
    const totalCoin = coinSummary.reduce((acc, summary) => {
      let summaryCurrencyRate: number
      if (summary.currency) summaryCurrencyRate = exchangeRate[summary.currency]
      else summaryCurrencyRate = 1
      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      return addAmount(acc, Number(summary.amount) * crossRate)
    }, 0)
    const totalEtc = etcSummary.reduce((acc, summary) => {
      // let summaryCurrencyRate: number
      // if (summary.currency) summaryCurrencyRate = exchangeRate[summary.currency]
      // else summaryCurrencyRate = 1
      const summaryCurrencyRate = 1
      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      return addAmount(acc, (Number(summary.currentPrice) || Number(summary.purchasePrice)) * crossRate)
    }, 0)
    const totalLiabilities = liabilitiesSummary.reduce((acc, summary) => {
      // let summaryCurrencyRate: number
      // if (summary.currency) summaryCurrencyRate = exchangeRate[summary.currency]
      // else summaryCurrencyRate = 1
      const summaryCurrencyRate = 1
      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      return addAmount(acc, (Number(summary.remainingAmount) || Number(summary.amount)) * crossRate)
    }, 0)

    return {
      bank: totalBank,
      stock: totalStock,
      coin: totalCoin,
      etc: totalEtc,
      liabilities: totalLiabilities,
    }
  }
}
