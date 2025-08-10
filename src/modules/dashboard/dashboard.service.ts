import { Injectable, Logger } from "@nestjs/common"
import { PrismaService } from "../../common/prisma"
import { ErrorMessage, ForbiddenException, JwtPayload, ValidationException } from "../../common"
import { AccountType, Prisma, SummaryType, UserRole } from "@prisma/client"
import { DashboardDetailItem } from "./models"
import { CreateRebalancingGoalInput } from "./inputs"

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

    const details: DashboardDetailItem[] = []

    const exchangeRateOne = await this.prisma.exchangeRate.findFirst({
      orderBy: { createdAt: "desc" },
    })
    if (!exchangeRateOne) return []

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
                               GROUP BY symbol) cph2
                              ON cph1.symbol = cph2.symbol AND cph1.createdAt = cph2.max_created_at
      `
    }

    for (const summary of coinSummary) {
      const accountName = summary.account.nickName

      const currentPrice = coinPriceHistories.find((cph) => cph.symbol === summary.symbol)

      if (!currentPrice && summary.type !== SummaryType.CASH) {
        this.logger.warn(`⚠️ ${summary.symbol} 코인의 현재 가격을 찾을 수 없습니다.`)
        continue
      }

      let amountInDefaultCurrency: number

      if (summary.type === SummaryType.CASH) {
        const summaryCurrencyRate = summary.currency ? exchangeRate[summary.currency] : 1
        if (!summaryCurrencyRate) {
          this.logger.warn(`⚠️ ${summary.currency}의 환율을 찾을 수 없습니다.`)
          continue
        }
        const crossRate = defaultCurrencyRate / summaryCurrencyRate
        amountInDefaultCurrency = Number(summary.amount) * crossRate

        details.push({
          accountId: summary.accountId,
          accountName: accountName,
          name: `${accountName} (Cash)`,
          accountType: AccountType.COIN,
          assetType: "CASH",
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
        if (!coinPriceCurrencyRate) {
          this.logger.warn(`⚠️ ${currentPrice.currency}의 환율을 찾을 수 없습니다.`)
          continue
        }
        const crossRate = defaultCurrencyRate / coinPriceCurrencyRate
        amountInDefaultCurrency = coinValueInUSD * crossRate

        const summaryCurrencyRate = summary.currency ? exchangeRate[summary.currency] : 1
        const crossRateInSummaryCurrency = summaryCurrencyRate / coinPriceCurrencyRate
        const coinValueInSummaryCurrency = coinValueInUSD * crossRateInSummaryCurrency
        const unrealizedPnL = coinValueInSummaryCurrency - Number(summary.amount)
        const summaryToDefaultCurrencyRate = defaultCurrencyRate / summaryCurrencyRate
        const unrealizedPnLInDefaultCurrency = unrealizedPnL * summaryToDefaultCurrencyRate
        const unrealizedPnLPercentage = Number(summary.amount) > 0 ? (unrealizedPnL / Number(summary.amount)) * 100 : 0

        details.push({
          accountId: summary.accountId,
          accountName: accountName,
          name: summary.name,
          accountType: AccountType.COIN,
          assetType: "ASSET",
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
                               GROUP BY symbol) sph2
                              ON sph1.symbol = sph2.symbol AND sph1.createdAt = sph2.max_created_at
      `
    }

    for (const summary of stockSummary) {
      const accountName = summary.account.nickName

      const currentPrice = stockPriceHistories.find((sph) => sph.symbol === summary.symbol)

      if (!currentPrice && summary.type !== SummaryType.CASH) {
        this.logger.warn(`⚠️ ${summary.symbol} 주식의 현재 가격을 찾을 수 없습니다.`)
        continue
      }

      let amountInDefaultCurrency: number

      if (summary.type === SummaryType.CASH) {
        const summaryCurrencyRate = summary.currency ? exchangeRate[summary.currency] : 1
        if (!summaryCurrencyRate) {
          this.logger.warn(`⚠️ ${summary.currency}의 환율을 찾을 수 없습니다.`)
          continue
        }

        const crossRate = defaultCurrencyRate / summaryCurrencyRate
        amountInDefaultCurrency = Number(summary.amount) * crossRate

        details.push({
          accountId: summary.accountId,
          accountName: accountName,
          name: `${accountName} (Cash)`,
          accountType: AccountType.STOCK,
          assetType: "CASH",
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
        if (!currentPriceCurrencyRate) {
          this.logger.warn(`⚠️ ${currentPrice.currency}의 환율을 찾을 수 없습니다.`)
          continue
        }
        const crossRate = defaultCurrencyRate / currentPriceCurrencyRate
        amountInDefaultCurrency = stockValue * crossRate

        const summaryCurrencyRate = summary.currency ? exchangeRate[summary.currency] : 1
        const crossRateInSummaryCurrency = summaryCurrencyRate / currentPriceCurrencyRate
        const stockValueInSummaryCurrency =
          Number(summary.quantity) * Number(currentPrice.base) * crossRateInSummaryCurrency
        const unrealizedPnL = stockValueInSummaryCurrency - Number(summary.amount)
        const summaryToDefaultCurrencyRate = defaultCurrencyRate / summaryCurrencyRate
        const unrealizedPnLInDefaultCurrency = unrealizedPnL * summaryToDefaultCurrencyRate
        const unrealizedPnLPercentage = Number(summary.amount) > 0 ? (unrealizedPnL / Number(summary.amount)) * 100 : 0

        details.push({
          accountId: summary.accountId,
          accountName: accountName,
          name: summary.name,
          accountType: AccountType.STOCK,
          assetType: "ASSET",
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
        this.logger.warn(`⚠️ ${summary.currency}의 환율을 찾을 수 없습니다.`)
        continue
      }

      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      const amountInDefaultCurrency = Number(summary.balance) * crossRate

      details.push({
        accountId: summary.accountId,
        accountName: accountName,
        name: `${accountName} (Cash)`,
        accountType: AccountType.BANK,
        assetType: "CASH",
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
        this.logger.warn(`⚠️ ${transaction.currency}의 환율을 찾을 수 없습니다.`)
        continue
      }
      const crossRate = defaultCurrencyRate / transactionCurrencyRate
      const amountInDefaultCurrency =
        (Number(transaction.currentPrice) || Number(transaction.purchasePrice)) * crossRate

      details.push({
        accountId: transaction.accountId,
        accountName: accountName,
        name: transaction.name,
        accountType: AccountType.ETC,
        assetType: "ASSET",
        currency: transaction.currency,
        purchaseAmount: Number(transaction.purchasePrice),
        currentValue: Number(transaction.currentPrice),
        currentValueInDefaultCurrency: amountInDefaultCurrency,
        unrealizedPnL: Number(transaction.currentPrice) - Number(transaction.purchasePrice),
        unrealizedPnLInDefaultCurrency: amountInDefaultCurrency - Number(transaction.purchasePrice) * crossRate,
        unrealizedPnLPercentage:
          Number(transaction.purchasePrice) > 0
            ? ((Number(transaction.currentPrice) - Number(transaction.purchasePrice)) /
                Number(transaction.purchasePrice)) *
              100
            : 0,
      })
    }

    for (const transaction of liabilitiesTransactions) {
      const accountName = transaction.account.nickName
      const transactionCurrencyRate = transaction.currency ? exchangeRate[transaction.currency] : 1
      if (!transactionCurrencyRate) {
        this.logger.warn(`⚠️ ${transaction.currency}의 환율을 찾을 수 없습니다.`)
        continue
      }
      const crossRate = defaultCurrencyRate / transactionCurrencyRate
      const amountInDefaultCurrency = (Number(transaction.remainingAmount) || Number(transaction.amount)) * crossRate

      details.push({
        accountId: transaction.accountId,
        accountName: accountName,
        name: transaction.name,
        accountType: AccountType.LIABILITIES,
        assetType: "LIABILITIES",
        currency: transaction.currency,
        purchaseAmount: Number(transaction.amount),
        currentValue: Number(transaction.remainingAmount),
        currentValueInDefaultCurrency: -amountInDefaultCurrency,
        unrealizedPnL: 0,
        unrealizedPnLInDefaultCurrency: 0,
        unrealizedPnLPercentage: 0,
      })
    }

    return details
  }

  async getRebalancingGoals(jwtPayload: JwtPayload) {
    let userId: number

    if (jwtPayload.role !== UserRole.ADMIN) {
      userId = jwtPayload.id
    } else {
      userId = jwtPayload.id
    }

    if (!userId) throw new ValidationException(ErrorMessage.MSG_PARAMETER_REQUIRED)

    return this.prisma.rebalancingGoal.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
    })
  }

  async updateRebalancingTarget(jwtPayload: JwtPayload, createRebalancingGoalInput: CreateRebalancingGoalInput) {
    let userId: number

    if (jwtPayload.role !== UserRole.ADMIN) {
      if (createRebalancingGoalInput.userId) throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)
      userId = jwtPayload.id
    } else {
      if (!createRebalancingGoalInput.userId) userId = jwtPayload.id
      else userId = createRebalancingGoalInput.userId
    }

    if (!userId) throw new ValidationException(ErrorMessage.MSG_PARAMETER_REQUIRED)

    const referenceId = createRebalancingGoalInput.referenceId || "0"

    const upsertData: Prisma.RebalancingGoalUpsertArgs = {
      where: {
        userId_goalType_referenceId: {
          userId: userId,
          goalType: createRebalancingGoalInput.goalType,
          referenceId: referenceId,
        },
      },
      update: {
        targetRatio: createRebalancingGoalInput.targetRatio,
      },
      create: {
        ...createRebalancingGoalInput,
        referenceId: referenceId,
        userId: userId,
      },
    }

    return this.prisma.rebalancingGoal.upsert(upsertData)
  }
}
