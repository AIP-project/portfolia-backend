import { Injectable, Logger } from "@nestjs/common"
import { Account, AccountInput, AccountsArgs, CreateAccountInput, UpdateAccountInput } from "./dto"
import { addAmount, ErrorMessage, ForbiddenException, JwtPayload, ValidationException } from "../common"
import { PrismaService } from "../common/prisma"
import { AccountType, Prisma, SummaryType, UserRole } from "@prisma/client"

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name)

  constructor(private readonly prisma: PrismaService) {}

  private async commonCheckAccount(jwtPayload: JwtPayload, accountInput: AccountInput) {
    const cleanInput = new AccountInput()
    if (jwtPayload.role !== UserRole.ADMIN) {
      if (accountInput.userId) throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)
      cleanInput.userId = jwtPayload.id
    } else {
      if (!accountInput.userId) cleanInput.userId = jwtPayload.id
      else cleanInput.userId = accountInput.userId
    }

    if (!cleanInput.userId) throw new ValidationException(ErrorMessage.MSG_PARAMETER_REQUIRED)

    return { ...accountInput, ...cleanInput }
  }

  async createAccount(jwtPayload: JwtPayload, createAccountInput: CreateAccountInput) {
    const cleanInput = await this.cleanCreateAccount(jwtPayload, createAccountInput)
    let summaryName = ""
    if (cleanInput.type === AccountType.BANK) {
      if (!createAccountInput.bankSummary.name) throw new ValidationException(ErrorMessage.MSG_PARAMETER_REQUIRED)
      summaryName = createAccountInput.bankSummary.name
    } else if (cleanInput.type === AccountType.STOCK) {
      if (!createAccountInput.stockSummary.name) throw new ValidationException(ErrorMessage.MSG_PARAMETER_REQUIRED)
      summaryName = createAccountInput.stockSummary.name
    } else if (cleanInput.type === AccountType.COIN) {
      if (!createAccountInput.coinSummary.name) throw new ValidationException(ErrorMessage.MSG_PARAMETER_REQUIRED)
      summaryName = createAccountInput.coinSummary.name
    }
    if (!cleanInput.nickName) cleanInput.nickName = summaryName
    return this.txCreateAccount(cleanInput)
  }

  private async cleanCreateAccount(jwtPayload: JwtPayload, createAccountInput: CreateAccountInput) {
    const cleanInput = await this.commonCheckAccount(jwtPayload, createAccountInput)
    return { ...createAccountInput, ...cleanInput } as CreateAccountInput
  }

  private async txCreateAccount(cleanInput: CreateAccountInput) {
    return this.prisma.$transaction(async (prisma) => {
      const { bankSummary, stockSummary, coinSummary, userId, ...accountInput } = cleanInput
      const account = await prisma.account.create({
        data: {
          ...accountInput,
          nickName: accountInput.nickName!,
          userId: userId,
        },
      })

      if (account.type === AccountType.BANK) {
        await prisma.bankSummary.create({
          data: { accountId: account.id, currency: account.currency, ...bankSummary },
        })
      } else if (account.type === AccountType.STOCK) {
        await prisma.stockSummary.create({
          data: {
            accountId: account.id,
            type: SummaryType.CASH,
            currency: account.currency,
            ...stockSummary,
          },
        })
      } else if (account.type === AccountType.COIN) {
        await prisma.coinSummary.create({
          data: {
            accountId: account.id,
            type: SummaryType.CASH,
            currency: account.currency,
            ...coinSummary,
          },
        })
      } else if (account.type === AccountType.ETC) {
        await prisma.etcSummary.create({
          data: { accountId: account.id, currency: account.currency },
        })
      } else if (account.type === AccountType.LIABILITIES) {
        await prisma.liabilitiesSummary.create({
          data: { accountId: account.id, currency: account.currency },
        })
      }
      return account
    })
  }

  async accounts(jwtPayload: JwtPayload, accountsArgs: AccountsArgs) {
    const { page = 1, take = 10, sortBy = [], name, type, userId } = accountsArgs
    const skip = (page - 1) * take

    let searchUserId = jwtPayload.id
    if (jwtPayload.role !== UserRole.ADMIN) {
      if (userId) throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)
      searchUserId = jwtPayload.id
    } else {
      if (userId) searchUserId = userId
    }

    const whereConditions: Prisma.AccountWhereInput = {
      isDelete: false,
    }

    if (searchUserId) whereConditions.userId = searchUserId
    if (name) whereConditions.nickName = { contains: name }
    if (type) whereConditions.type = type

    // Order by 설정
    const orderBy: Prisma.AccountOrderByWithRelationInput =
      sortBy.length > 0
        ? sortBy.reduce(
            (acc, { field, direction }) => ({
              ...acc,
              [field]: direction ? "asc" : "desc",
            }),
            {},
          )
        : { createdAt: "asc" } // 기본 정렬

    const [accounts, total] = await Promise.all([
      this.prisma.account.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy,
      }),
      this.prisma.account.count({
        where: whereConditions,
      }),
    ])

    const totalPages = Math.ceil(total / take)

    return {
      edges: accounts,
      pageInfo: {
        total,
        page,
        take,
        hasNextPage: page < totalPages,
        totalPages,
      },
    }
  }

  async account(jwtPayload: JwtPayload, id: number) {
    const account = await this.prisma.account.findFirst({
      where: { id: id, isDelete: false },
    })

    if (!account) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (account.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    return account
  }

  async updateAccount(jwtPayload: JwtPayload, updateAccountInput: UpdateAccountInput) {
    const cleanInput = await this.cleanUpdateAccount(jwtPayload, updateAccountInput)
    if (cleanInput.isDelete) {
      return this.txDeleteAccount(cleanInput)
    } else {
      return this.txUpdateAccount(cleanInput)
    }
  }

  private async cleanUpdateAccount(jwtPayload: JwtPayload, updateAccountInput: UpdateAccountInput) {
    const cleanInput = await this.commonCheckAccount(jwtPayload, updateAccountInput)
    const existingAccount = await this.prisma.account.findFirst({
      where: { id: cleanInput.id, isDelete: false },
    })
    if (!existingAccount) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== cleanInput.userId) throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)
    return { ...updateAccountInput, ...cleanInput } as UpdateAccountInput
  }

  private async txUpdateAccount(cleanInput: UpdateAccountInput) {
    return this.prisma.account.update({
      where: { id: cleanInput.id },
      data: cleanInput,
    })
  }

  /**
   * 계정 삭제를 위한 트랜잭션 함수
   * 계정과 관련된 모든 summary와 transaction을 함께 삭제 처리
   */
  private async txDeleteAccount(cleanInput: UpdateAccountInput) {
    return this.prisma.$transaction(async (prisma) => {
      // 계정 정보 조회
      const existingAccount = await prisma.account.findUnique({
        where: { id: cleanInput.id },
      })

      if (!existingAccount) {
        throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
      }

      const accountId = existingAccount.id

      // 계정 타입에 따라 관련 엔티티 삭제
      switch (existingAccount.type) {
        case AccountType.BANK:
          await this.txDeleteBankEntities(prisma, accountId)
          break
        case AccountType.STOCK:
          await this.txDeleteStockEntities(prisma, accountId)
          break
        case AccountType.COIN:
          await this.txDeleteCoinEntities(prisma, accountId)
          break
        case AccountType.ETC:
          await this.txDeleteEtcEntities(prisma, accountId)
          break
        case AccountType.LIABILITIES:
          await this.txDeleteLiabilitiesEntities(prisma, accountId)
          break
      }

      // 계정 자체를 논리적으로 삭제 (isDelete = true)
      return prisma.account.update({
        where: { id: existingAccount.id },
        data: { isDelete: true },
      })
    })
  }

  /**
   * 은행 계정 관련 엔티티 삭제 트랜잭션 함수
   */
  private async txDeleteBankEntities(prisma: Prisma.TransactionClient, accountId: number) {
    // 은행 요약 정보 삭제
    await prisma.bankSummary.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })

    // 은행 거래 정보 삭제
    await prisma.bankTransaction.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })
  }

  /**
   * 주식 계정 관련 엔티티 삭제 트랜잭션 함수
   */
  private async txDeleteStockEntities(prisma: Prisma.TransactionClient, accountId: number) {
    // 주식 요약 정보 삭제
    await prisma.stockSummary.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })

    // 주식 거래 정보 삭제
    await prisma.stockTransaction.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })
  }

  /**
   * 코인 계정 관련 엔티티 삭제 트랜잭션 함수
   */
  private async txDeleteCoinEntities(prisma: Prisma.TransactionClient, accountId: number) {
    // 코인 요약 정보 삭제
    await prisma.coinSummary.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })

    // 코인 거래 정보 삭제
    await prisma.coinTransaction.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })
  }

  /**
   * 기타 계정 관련 엔티티 삭제 트랜잭션 함수
   */
  private async txDeleteEtcEntities(prisma: Prisma.TransactionClient, accountId: number) {
    // 기타 요약 정보 삭제
    await prisma.etcSummary.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })

    // 기타 거래 정보 삭제
    await prisma.etcTransaction.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })
  }

  /**
   * 부채 계정 관련 엔티티 삭제 트랜잭션 함수
   */
  private async txDeleteLiabilitiesEntities(prisma: Prisma.TransactionClient, accountId: number) {
    // 부채 요약 정보 삭제
    await prisma.liabilitiesSummary.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })

    // 부채 거래 정보 삭제
    await prisma.liabilitiesTransaction.updateMany({
      where: { accountId },
      data: { isDelete: true },
    })
  }

  async resolveBankSummary(payload: JwtPayload, account: Account) {
    if (account.type !== AccountType.BANK) return null
    return this.prisma.bankSummary.findFirst({
      where: {
        accountId: account.id,
        account: { userId: payload.id, isDelete: false },
      },
    })
  }

  async resolveStockSummary(payload: JwtPayload, account: Account) {
    if (account.type !== AccountType.STOCK) return null
    return this.prisma.stockSummary.findFirst({
      where: {
        accountId: account.id,
        type: SummaryType.CASH,
        account: { userId: payload.id, isDelete: false },
      },
    })
  }

  async resolveCoinSummary(payload: JwtPayload, account: Account) {
    if (account.type !== AccountType.COIN) return null
    return this.prisma.coinSummary.findFirst({
      where: {
        accountId: account.id,
        type: SummaryType.CASH,
        account: { userId: payload.id, isDelete: false },
      },
    })
  }

  async resolveEtcSummary(payload: JwtPayload, account: Account) {
    if (account.type !== AccountType.ETC) return null
    return this.prisma.etcSummary.findFirst({
      where: {
        accountId: account.id,
        account: { userId: payload.id, isDelete: false },
      },
    })
  }

  async resolveLiabilitiesSummary(payload: JwtPayload, account: Account) {
    if (account.type !== AccountType.LIABILITIES) return null
    return this.prisma.liabilitiesSummary.findFirst({
      where: {
        accountId: account.id,
        account: { userId: payload.id, isDelete: false },
      },
    })
  }

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

    const etcSummary = await this.prisma.etcSummary.findMany({
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
      include: { account: true },
    })

    const liabilitiesSummary = await this.prisma.liabilitiesSummary.findMany({
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
      include: { account: true },
    })

    const bankSummary = await this.prisma.bankSummary.findMany({
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
      include: { account: true },
    })

    const assets = []
    const liabilities = []
    const cash = []

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
        SELECT cph1.symbol, cph1.price
        FROM coin_price_history cph1
               INNER JOIN (SELECT symbol, MAX(createdAt) as max_created_at
                           FROM coin_price_history
                           WHERE symbol IN (${Prisma.join(coinSymbols)})
                           GROUP BY symbol) cph2 ON cph1.symbol = cph2.symbol AND cph1.createdAt = cph2.max_created_at
      `
    }

    for (const summary of coinSummary) {
      const accountName = summary.account.nickName

      let summaryCurrencyRate: number
      if (summary.currency) summaryCurrencyRate = exchangeRate[summary.currency]
      else summaryCurrencyRate = 1
      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      const currentPrice = coinPriceHistories.find((cph) => cph.symbol === summary.symbol)?.price
      const amountInDefaultCurrency = (currentPrice ? Number(currentPrice) : Number(summary.amount)) * crossRate

      if (summary.type === SummaryType.CASH) {
        const existingCash = cash.find((s) => s.name === accountName)
        if (existingCash) {
          existingCash.amount = addAmount(existingCash.amount, amountInDefaultCurrency)
        } else {
          cash.push({ name: accountName, amount: amountInDefaultCurrency, type: AccountType.COIN })
        }
        cashTotalAmount = addAmount(cashTotalAmount, amountInDefaultCurrency)
      } else {
        const existingSummary = assets.find((s) => s.name === accountName)
        if (existingSummary) {
          existingSummary.amount = addAmount(existingSummary.amount, amountInDefaultCurrency)
        } else {
          assets.push({ name: accountName, amount: amountInDefaultCurrency, type: AccountType.COIN })
        }
        assetTotalAmount = addAmount(assetTotalAmount, amountInDefaultCurrency)
      }
    }

    const stockSymbols = stockSummary
      .filter((summary) => summary.type === SummaryType.SUMMARY)
      .map((summary) => summary.symbol)
      .filter(Boolean)

    let stockPriceHistories: any[] = []

    if (stockSymbols.length > 0) {
      stockPriceHistories = await this.prisma.$queryRaw`
        SELECT sph1.symbol, sph1.base
        FROM stock_price_history sph1
               INNER JOIN (SELECT symbol, MAX(createdAt) as max_created_at
                           FROM stock_price_history
                           WHERE symbol IN (${Prisma.join(stockSymbols)})
                           GROUP BY symbol) sph2 ON sph1.symbol = sph2.symbol AND sph1.createdAt = sph2.max_created_at
      `
    }

    for (const summary of stockSummary) {
      const accountName = summary.account.nickName

      let summaryCurrencyRate: number
      if (summary.currency) summaryCurrencyRate = exchangeRate[summary.currency]
      else summaryCurrencyRate = 1
      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      const currentPrice = stockPriceHistories.find((sph) => sph.symbol === summary.symbol)?.base
      const amountInDefaultCurrency = (currentPrice ? Number(currentPrice) : Number(summary.amount)) * crossRate

      if (summary.type === SummaryType.CASH) {
        const existingCash = cash.find((s) => s.name === accountName)
        if (existingCash) {
          existingCash.amount = addAmount(existingCash.amount, amountInDefaultCurrency)
        } else {
          cash.push({ name: accountName, amount: amountInDefaultCurrency, type: AccountType.STOCK })
        }
        cashTotalAmount = addAmount(cashTotalAmount, amountInDefaultCurrency)
      } else {
        const existingSummary = assets.find((s) => s.name === accountName)
        if (existingSummary) {
          existingSummary.amount = addAmount(existingSummary.amount, amountInDefaultCurrency)
        } else {
          assets.push({ name: accountName, amount: amountInDefaultCurrency, type: AccountType.STOCK })
        }
        assetTotalAmount = addAmount(assetTotalAmount, amountInDefaultCurrency)
      }
    }

    for (const summary of etcSummary) {
      const accountName = summary.account.nickName
      let summaryCurrencyRate: number
      if (summary.currency) summaryCurrencyRate = exchangeRate[summary.currency]
      else summaryCurrencyRate = 1

      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      const amountInDefaultCurrency = (Number(summary.currentPrice) || Number(summary.purchasePrice)) * crossRate

      const existingSummary = assets.find((s) => s.name === accountName)
      if (existingSummary) {
        existingSummary.amount = addAmount(existingSummary.amount, amountInDefaultCurrency)
      } else {
        assets.push({ name: accountName, amount: amountInDefaultCurrency, type: AccountType.ETC })
      }
      assetTotalAmount = addAmount(assetTotalAmount, amountInDefaultCurrency)
    }

    for (const summary of liabilitiesSummary) {
      const accountName = summary.account.nickName
      let summaryCurrencyRate: number
      if (summary.currency) summaryCurrencyRate = exchangeRate[summary.currency]
      else summaryCurrencyRate = 1
      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      const amountInDefaultCurrency = (Number(summary.remainingAmount) || Number(summary.amount)) * crossRate

      const existingSummary = liabilities.find((s) => s.name === accountName)
      if (existingSummary) {
        existingSummary.amount = addAmount(existingSummary.amount, amountInDefaultCurrency)
      } else {
        liabilities.push({ name: accountName, amount: amountInDefaultCurrency, type: AccountType.LIABILITIES })
      }
      liabilitiesTotalAmount = addAmount(liabilitiesTotalAmount, amountInDefaultCurrency)
    }

    for (const summary of bankSummary) {
      const accountName = summary.account.nickName
      let summaryCurrencyRate: number
      if (summary.currency) summaryCurrencyRate = exchangeRate[summary.currency]
      else summaryCurrencyRate = 1
      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      const amountInDefaultCurrency = Number(summary.balance) * crossRate

      const existingCash = cash.find((s) => s.name === accountName)
      if (existingCash) {
        existingCash.amount = addAmount(existingCash.amount, amountInDefaultCurrency)
      } else {
        cash.push({ name: accountName, amount: amountInDefaultCurrency, type: AccountType.BANK })
      }
      cashTotalAmount = addAmount(cashTotalAmount, amountInDefaultCurrency)
    }

    const temp = {
      asset: assets,
      liabilities: liabilities,
      cash: cash,
      assetTotalAmount: assetTotalAmount,
      liabilitiesTotalAmount: liabilitiesTotalAmount,
      cashTotalAmount: cashTotalAmount,
    }

    console.log("Dashboard Summary:", JSON.stringify(temp, null, 2))

    return {
      asset: assets,
      liabilities: liabilities,
      cash: cash,
      assetTotalAmount: assetTotalAmount,
      liabilitiesTotalAmount: liabilitiesTotalAmount,
      cashTotalAmount: cashTotalAmount,
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
      let summaryCurrencyRate: number
      if (summary.currency) summaryCurrencyRate = exchangeRate[summary.currency]
      else summaryCurrencyRate = 1
      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      return addAmount(acc, (Number(summary.currentPrice) || Number(summary.purchasePrice)) * crossRate)
    }, 0)
    const totalLiabilities = liabilitiesSummary.reduce((acc, summary) => {
      let summaryCurrencyRate: number
      if (summary.currency) summaryCurrencyRate = exchangeRate[summary.currency]
      else summaryCurrencyRate = 1
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
