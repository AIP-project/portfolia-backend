import { Injectable, Logger } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { EntityManager, FindOptionsWhere, ILike, In, Repository } from "typeorm"
import { Account } from "./entities/account.entity"
import { AccountInput, AccountsArgs, CreateAccountInput, UpdateAccountInput } from "./dto"
import { BankSummary } from "../bank-summary/entities"
import { StockSummary } from "../stock-summary/entities"
import { CoinSummary } from "../coin-summary/entities"
import {
  AccountType,
  addAmount,
  ErrorMessage,
  ForbiddenException,
  JwtPayload,
  SummaryType,
  UserRole,
  ValidationException,
} from "../common"
import { EtcSummary } from "../etc-summary/entities"
import { LiabilitiesSummary } from "../liabilities-summary/entities"
import { BankTransaction } from "../bank-transaction/entities"
import { StockTransaction } from "../stock-transaction/entities"
import { CoinTransaction } from "../coin-transaction/entities"
import { EtcTransaction } from "../etc-transaction/entities"
import { LiabilitiesTransaction } from "../liabilities-transaction/entities"
import { ExchangeRate } from "../exchange/entities/exchange-rate.entity"
import { CoinPriceHistory } from "../coin-price-history/entities"
import { StockPriceHistory } from "../stock-price-history/entities"

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name)

  constructor(@InjectRepository(Account) private readonly accountRepository: Repository<Account>) {}

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

    if (accountInput.nickName) {
      const existAccountName = await this.accountRepository.exists({
        where: {
          user: {
            id: cleanInput.userId,
          },
          nickName: accountInput.nickName,
          isDelete: false,
          type: accountInput.type,
        },
      })

      if (existAccountName) throw new ForbiddenException(ErrorMessage.MSG_ACCOUNT_NAME_ALREADY_EXISTS)
    }
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
    return this.accountRepository.manager.transaction(async (manager) => {
      const { bankSummary, stockSummary, coinSummary, ...accountInput } = cleanInput
      const account = await manager.save(Account, accountInput)
      if (account.type === AccountType.BANK) {
        await manager.save(BankSummary, { accountId: account.id, currency: account.currency, ...bankSummary })
      } else if (account.type === AccountType.STOCK) {
        await manager.save(StockSummary, {
          accountId: account.id,
          type: SummaryType.CASH,
          currency: account.currency,
          ...stockSummary,
        })
      } else if (account.type === AccountType.COIN) {
        await manager.save(CoinSummary, {
          accountId: account.id,
          type: SummaryType.CASH,
          currency: account.currency,
          ...coinSummary,
        })
      } else if (account.type === AccountType.ETC) {
        await manager.save(EtcSummary, { accountId: account.id, currency: account.currency })
      } else if (account.type === AccountType.LIABILITIES) {
        await manager.save(LiabilitiesSummary, { accountId: account.id, currency: account.currency })
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

    const whereConditions: FindOptionsWhere<Account> = {
      isDelete: false,
    }

    if (searchUserId) whereConditions.user = { id: searchUserId }
    if (name) whereConditions.nickName = ILike(`%${name}%`)
    if (type) whereConditions.type = type

    // Order by 설정
    const order =
      sortBy.length > 0
        ? sortBy.reduce(
            (acc, { field, direction }) => ({
              ...acc,
              [field]: direction ? "ASC" : "DESC",
            }),
            {},
          )
        : { createdAt: "ASC" } // 기본 정렬

    const [accounts, total] = await this.accountRepository.findAndCount({
      where: whereConditions,
      skip,
      take,
      order,
    })

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
    const account = await this.accountRepository.findOne({ where: { id: id, isDelete: false } })

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
    const existingAccount = await this.accountRepository.findOne({
      where: { id: cleanInput.id, isDelete: false },
    })
    if (!existingAccount) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== cleanInput.userId) throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)
    return { ...updateAccountInput, ...cleanInput } as UpdateAccountInput
  }

  private async txUpdateAccount(cleanInput: UpdateAccountInput) {
    return this.accountRepository.manager.transaction(async (manager) => {
      const existingAccount = await manager.findOne(Account, {
        where: { id: cleanInput.id },
      })

      const updatedAccount = manager.merge(Account, existingAccount, cleanInput)
      return await manager.save(Account, updatedAccount)
    })
  }

  /**
   * 계정 삭제를 위한 트랜잭션 함수
   * 계정과 관련된 모든 summary와 transaction을 함께 삭제 처리
   */
  private async txDeleteAccount(cleanInput: UpdateAccountInput) {
    return this.accountRepository.manager.transaction(async (manager) => {
      // 계정 정보 조회
      const existingAccount = await manager.findOne(Account, {
        where: { id: cleanInput.id },
      })

      if (!existingAccount) {
        throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
      }

      const accountId = existingAccount.id

      // 계정 타입에 따라 관련 엔티티 삭제
      switch (existingAccount.type) {
        case AccountType.BANK:
          await this.txDeleteBankEntities(manager, accountId)
          break
        case AccountType.STOCK:
          await this.txDeleteStockEntities(manager, accountId)
          break
        case AccountType.COIN:
          await this.txDeleteCoinEntities(manager, accountId)
          break
        case AccountType.ETC:
          await this.txDeleteEtcEntities(manager, accountId)
          break
        case AccountType.LIABILITIES:
          await this.txDeleteLiabilitiesEntities(manager, accountId)
          break
      }

      // 계정 자체를 논리적으로 삭제 (isDelete = true)
      const updatedAccount = manager.merge(Account, existingAccount, { isDelete: true })
      return await manager.save(Account, updatedAccount)
    })
  }

  /**
   * 은행 계정 관련 엔티티 삭제 트랜잭션 함수
   */
  private async txDeleteBankEntities(manager: EntityManager, accountId: number) {
    // 은행 요약 정보 삭제
    await manager.update(BankSummary, { accountId }, { isDelete: true })

    // 은행 거래 정보 삭제
    await manager.update(BankTransaction, { accountId }, { isDelete: true })
  }

  /**
   * 주식 계정 관련 엔티티 삭제 트랜잭션 함수
   */
  private async txDeleteStockEntities(manager: EntityManager, accountId: number) {
    // 주식 요약 정보 삭제
    await manager.update(StockSummary, { accountId }, { isDelete: true })

    // 주식 거래 정보 삭제
    await manager.update(StockTransaction, { accountId }, { isDelete: true })
  }

  /**
   * 코인 계정 관련 엔티티 삭제 트랜잭션 함수
   */
  private async txDeleteCoinEntities(manager: EntityManager, accountId: number) {
    // 코인 요약 정보 삭제
    await manager.update(CoinSummary, { accountId }, { isDelete: true })

    // 코인 거래 정보 삭제
    await manager.update(CoinTransaction, { accountId }, { isDelete: true })
  }

  /**
   * 기타 계정 관련 엔티티 삭제 트랜잭션 함수
   */
  private async txDeleteEtcEntities(manager: EntityManager, accountId: number) {
    // 기타 요약 정보 삭제
    await manager.update(EtcSummary, { accountId }, { isDelete: true })

    // 기타 거래 정보 삭제
    await manager.update(EtcTransaction, { accountId }, { isDelete: true })
  }

  /**
   * 부채 계정 관련 엔티티 삭제 트랜잭션 함수
   */
  private async txDeleteLiabilitiesEntities(manager: EntityManager, accountId: number) {
    // 부채 요약 정보 삭제
    await manager.update(LiabilitiesSummary, { accountId }, { isDelete: true })

    // 부채 거래 정보 삭제
    await manager.update(LiabilitiesTransaction, { accountId }, { isDelete: true })
  }

  async resolveBankSummary(payload: JwtPayload, account: Account) {
    if (account.type !== AccountType.BANK) return null
    return this.accountRepository.manager.findOne(BankSummary, {
      where: { accountId: account.id, account: { userId: payload.id, isDelete: false } },
    })
  }

  async resolveStockSummary(payload: JwtPayload, account: Account) {
    if (account.type !== AccountType.STOCK) return null
    return this.accountRepository.manager.findOne(StockSummary, {
      where: { accountId: account.id, type: SummaryType.CASH, account: { userId: payload.id, isDelete: false } },
    })
  }

  async resolveCoinSummary(payload: JwtPayload, account: Account) {
    if (account.type !== AccountType.COIN) return null
    return this.accountRepository.manager.findOne(CoinSummary, {
      where: { accountId: account.id, type: SummaryType.CASH, account: { userId: payload.id, isDelete: false } },
    })
  }

  async resolveEtcSummary(payload: JwtPayload, account: Account) {
    if (account.type !== AccountType.ETC) return null
    return this.accountRepository.manager.findOne(EtcSummary, {
      where: { accountId: account.id, account: { userId: payload.id, isDelete: false } },
    })
  }

  async resolveLiabilitiesSummary(payload: JwtPayload, account: Account) {
    if (account.type !== AccountType.LIABILITIES) return null
    return this.accountRepository.manager.findOne(LiabilitiesSummary, {
      where: { accountId: account.id, account: { userId: payload.id, isDelete: false } },
    })
  }

  async dashboard(jwtPayload: JwtPayload) {
    // 각 summary 조회 쿼리에서 관계를 명시적으로 로드
    // relationLoadStrategy: "join"으로 설정하면 INNER JOIN으로 한 번에 데이터를 가져옴
    const coinSummary = await this.accountRepository.manager.find(CoinSummary, {
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
      relations: { account: true },
      relationLoadStrategy: "join",
    })

    const stockSummary = await this.accountRepository.manager.find(StockSummary, {
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
      relations: { account: true },
      relationLoadStrategy: "join",
    })

    const etcSummary = await this.accountRepository.manager.find(EtcSummary, {
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
      relations: { account: true },
      relationLoadStrategy: "join",
    })

    const liabilitiesSummary = await this.accountRepository.manager.find(LiabilitiesSummary, {
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
      relations: { account: true },
      relationLoadStrategy: "join",
    })

    const bankSummary = await this.accountRepository.manager.find(BankSummary, {
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
      relations: { account: true },
      relationLoadStrategy: "join",
    })

    const assets = []
    const liabilities = []
    const cash = []

    // 총합 계산을 위한 변수
    let assetTotalAmount = 0
    let liabilitiesTotalAmount = 0
    let cashTotalAmount = 0

    const exchangeRateOne = await this.accountRepository.manager.findOne(ExchangeRate, {
      where: {},
      order: { createdAt: "DESC" },
    })
    if (!exchangeRateOne) return null

    const exchangeRate = exchangeRateOne.exchangeRates

    const defaultCurrencyRate = exchangeRate[jwtPayload.currency]

    const coinSymbols = coinSummary
      .filter((summary) => summary.type === SummaryType.SUMMARY)
      .map((summary) => summary.symbol)

    let coinPriceHistories: CoinPriceHistory[] = []

    if (coinSymbols.length > 0) {
      coinPriceHistories = await this.accountRepository.manager
        .createQueryBuilder(CoinPriceHistory, "cph")
        .where("cph.symbol IN (:...coinSymbols)", { coinSymbols })
        .distinctOn(["cph.symbol"])
        .orderBy("cph.symbol")
        .addOrderBy("cph.createdAt", "DESC")
        .getMany()
    }

    for (const summary of coinSummary) {
      const accountName = (await summary.account).nickName

      let summaryCurrencyRate: number
      if (summary.currency)
        summaryCurrencyRate = exchangeRate[summary.currency]
      else
        summaryCurrencyRate = 1
      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      const currentPrice = coinPriceHistories.find((cph) => cph.symbol === summary.symbol)?.price
      const amountInDefaultCurrency = (currentPrice || summary.amount) * crossRate

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

    let stockPriceHistories: StockPriceHistory[] = []

    if (stockSymbols.length > 0) {
      stockPriceHistories = await this.accountRepository.manager
        .createQueryBuilder(StockPriceHistory, "sph")
        .where("sph.symbol IN (:...stockSymbols)", { stockSymbols })
        .distinctOn(["sph.symbol"])
        .orderBy("sph.symbol")
        .addOrderBy("sph.createdAt", "DESC")
        .getMany()
    }

    for (const summary of stockSummary) {
      const accountName = (await summary.account).nickName

      let summaryCurrencyRate: number
      if (summary.currency)
        summaryCurrencyRate = exchangeRate[summary.currency]
      else
        summaryCurrencyRate = 1
      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      const currentPrice = stockPriceHistories.find((sph) => sph.symbol === summary.symbol)?.base
      const amountInDefaultCurrency = (currentPrice || summary.amount) * crossRate

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
      const accountName = (await summary.account).nickName
      let summaryCurrencyRate: number
      if (summary.currency)
        summaryCurrencyRate = exchangeRate[summary.currency]
      else
        summaryCurrencyRate = 1

      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      const amountInDefaultCurrency = (summary.currentPrice || summary.purchasePrice) * crossRate

      const existingSummary = assets.find((s) => s.name === accountName)
      if (existingSummary) {
        existingSummary.amount = addAmount(existingSummary.amount, amountInDefaultCurrency)
      } else {
        assets.push({ name: accountName, amount: amountInDefaultCurrency, type: AccountType.ETC })
      }
      assetTotalAmount = addAmount(assetTotalAmount, amountInDefaultCurrency)
    }

    for (const summary of liabilitiesSummary) {
      const accountName = (await summary.account).nickName
      let summaryCurrencyRate: number
      if (summary.currency)
        summaryCurrencyRate = exchangeRate[summary.currency]
      else
        summaryCurrencyRate = 1
      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      const amountInDefaultCurrency = (summary.remainingAmount || summary.amount) * crossRate

      const existingSummary = liabilities.find((s) => s.name === accountName)
      if (existingSummary) {
        existingSummary.amount = addAmount(existingSummary.amount, amountInDefaultCurrency)
      } else {
        liabilities.push({ name: accountName, amount: amountInDefaultCurrency, type: AccountType.LIABILITIES })
      }
      liabilitiesTotalAmount = addAmount(liabilitiesTotalAmount, amountInDefaultCurrency)
    }

    for (const summary of bankSummary) {
      const accountName = (await summary.account).nickName
      let summaryCurrencyRate: number
      if (summary.currency)
        summaryCurrencyRate = exchangeRate[summary.currency]
      else
        summaryCurrencyRate = 1
      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      const amountInDefaultCurrency = summary.balance * crossRate

      const existingCash = cash.find((s) => s.name === accountName)
      if (existingCash) {
        existingCash.amount = addAmount(existingCash.amount, amountInDefaultCurrency)
      } else {
        cash.push({ name: accountName, amount: amountInDefaultCurrency, type: AccountType.BANK })
      }
      cashTotalAmount = addAmount(cashTotalAmount, amountInDefaultCurrency)
    }

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
    const bankSummary = await this.accountRepository.manager.find(BankSummary, {
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
    })
    const stockSummary = await this.accountRepository.manager.find(StockSummary, {
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
    })
    const coinSummary = await this.accountRepository.manager.find(CoinSummary, {
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
    })
    const etcSummary = await this.accountRepository.manager.find(EtcSummary, {
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
    })
    const liabilitiesSummary = await this.accountRepository.manager.find(LiabilitiesSummary, {
      where: { account: { userId: jwtPayload.id, isDelete: false }, isDelete: false },
    })

    const exchangeRateOne = await this.accountRepository.manager.findOne(ExchangeRate, {
      where: {},
      order: { createdAt: "DESC" },
    })
    if (!exchangeRateOne) return null

    const exchangeRate = exchangeRateOne.exchangeRates

    const defaultCurrencyRate = exchangeRate[jwtPayload.currency]
    console.log(defaultCurrencyRate)

    const totalBank = bankSummary.reduce((acc, summary) => {
      let summaryCurrencyRate: number
      if (summary.currency)
        summaryCurrencyRate = exchangeRate[summary.currency]
      else
        summaryCurrencyRate = 1
      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      return addAmount(acc, summary.balance * crossRate)
    }, 0)
    const totalStock = stockSummary.reduce((acc, summary) => {
      let summaryCurrencyRate: number
      if (summary.currency)
        summaryCurrencyRate = exchangeRate[summary.currency]
      else
        summaryCurrencyRate = 1
      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      return addAmount(acc, summary.amount * crossRate)
    }, 0)
    const totalCoin = coinSummary.reduce((acc, summary) => {
      let summaryCurrencyRate: number
      if (summary.currency)
        summaryCurrencyRate = exchangeRate[summary.currency]
      else
        summaryCurrencyRate = 1
      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      return addAmount(acc, summary.amount * crossRate)
    }, 0)
    const totalEtc = etcSummary.reduce((acc, summary) => {
      let summaryCurrencyRate: number
      if (summary.currency)
        summaryCurrencyRate = exchangeRate[summary.currency]
      else
        summaryCurrencyRate = 1
      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      return addAmount(acc, (summary.currentPrice || summary.purchasePrice) * crossRate)
    }, 0)
    const totalLiabilities = liabilitiesSummary.reduce((acc, summary) => {
      let summaryCurrencyRate: number
      if (summary.currency)
        summaryCurrencyRate = exchangeRate[summary.currency]
      else
        summaryCurrencyRate = 1
      const crossRate = defaultCurrencyRate / summaryCurrencyRate
      return addAmount(acc, (summary.remainingAmount || summary.amount) * crossRate)
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
