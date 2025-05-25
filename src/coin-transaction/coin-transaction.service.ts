import { Injectable, Logger } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { FindOptionsWhere, ILike, LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm"
import { Account } from "../account/entities/account.entity"
import {
  AccountType,
  ErrorMessage,
  ForbiddenException,
  JwtPayload,
  parseISOString,
  SummaryType,
  TransactionType,
  UserRole,
  ValidationException,
} from "../common"
import {
  CoinTransactionInput,
  CoinTransactionsArgs,
  CreateCoinTransactionInput,
  UpdateCoinTransactionInput,
} from "./dto"
import { CoinTransaction } from "./entities"
import { CoinSummary } from "../coin-summary/entities"

@Injectable()
export class CoinTransactionService {
  private readonly logger = new Logger(CoinTransactionService.name)

  constructor(
    @InjectRepository(CoinTransaction) private readonly coinTransactionRepository: Repository<CoinTransaction>,
    @InjectRepository(CoinSummary) private readonly coinSummaryRepository: Repository<CoinSummary>,
    @InjectRepository(Account) private readonly accountRepository: Repository<Account>,
  ) {}

  private async commonCheckCoinTransaction(jwtPayload: JwtPayload, coinTransactionInput: CoinTransactionInput) {
    const cleanInput = new CoinTransactionInput()
    if (coinTransactionInput.quantity < 0)
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)

    if (coinTransactionInput.amount < 0)
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)

    if (coinTransactionInput.transactionDate) parseISOString(coinTransactionInput.transactionDate)

    const existingAccount = await this.accountRepository.findOne({
      where: { id: coinTransactionInput.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.type !== AccountType.COIN) throw new ValidationException(ErrorMessage.MSG_NOT_COIN_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    const existCashSummary = await this.coinSummaryRepository.findOne({
      where: { accountId: coinTransactionInput.accountId, type: SummaryType.CASH, isDelete: false },
    })

    if (!existCashSummary) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_COIN_SUMMARY)
    cleanInput.currency = existCashSummary.currency

    const existCoinSummary = await this.coinSummaryRepository.findOne({
      where: {
        accountId: coinTransactionInput.accountId,
        type: SummaryType.SUMMARY,
        symbol: coinTransactionInput.symbol,
        currency: coinTransactionInput.currency,
        isDelete: false,
      },
    })

    if (existCoinSummary) {
      cleanInput.name = existCoinSummary.name
    }

    const existSummary = {
      cash: existCashSummary,
      coin: existCoinSummary,
    }

    return {
      ...coinTransactionInput,
      ...cleanInput,
      existSummary,
    }
  }

  async createCoinTransaction(jwtPayload: JwtPayload, createCoinTransactionInput: CreateCoinTransactionInput) {
    const cleanInput = await this.cleanCoinTransaction(jwtPayload, createCoinTransactionInput)
    return this.txCreateCoinTransaction(cleanInput)
  }

  private async cleanCoinTransaction(jwtPayload: JwtPayload, createCoinTransactionInput: CreateCoinTransactionInput) {
    const cleanInput = await this.commonCheckCoinTransaction(jwtPayload, createCoinTransactionInput)

    const sign = cleanInput.type === TransactionType.DEPOSIT ? 1 : -1

    const coinSummary = cleanInput.existSummary.coin

    if (coinSummary) {
      coinSummary.quantity = coinSummary.quantity + sign * cleanInput.quantity
      coinSummary.amount = coinSummary.amount + sign * cleanInput.amount
    } else {
      cleanInput.existSummary.coin = {
        name: cleanInput.name,
        symbol: cleanInput.symbol,
        slug: cleanInput.slug,
        quantity: sign * cleanInput.quantity,
        currency: cleanInput.currency,
        amount: sign * cleanInput.amount,
        type: SummaryType.SUMMARY,
        accountId: cleanInput.accountId,
      }
    }

    return { ...createCoinTransactionInput, ...cleanInput }
  }

  private async txCreateCoinTransaction(
    cleanInput: CreateCoinTransactionInput & {
      existSummary: { cash: any; coin: any }
    },
  ) {
    return this.coinTransactionRepository.manager.transaction(async (manager) => {
      const { existSummary, ...input } = cleanInput

      const coinTransaction = await manager.save(CoinTransaction, input)

      await manager.upsert(CoinSummary, existSummary.coin, ["accountId", "type", "symbol", "currency"])

      return coinTransaction
    })
  }

  async coinTransactions(jwtPayload: JwtPayload, coinTransactionsArgs: CoinTransactionsArgs) {
    const {
      page = 1,
      take = 10,
      sortBy,
      name,
      symbol,
      type,
      note,
      fromTransactionDate,
      toTransactionDate,
      accountId,
    } = coinTransactionsArgs
    const skip = (page - 1) * take

    const existingAccount = await this.accountRepository.findOne({
      where: { id: accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    const whereConditions: FindOptionsWhere<CoinTransaction> = {
      isDelete: false,
      accountId,
    }

    if (name) whereConditions.name = ILike(`%${name}%`)
    if (note) whereConditions.note = ILike(`%${note}%`)
    if (type) whereConditions.type = type
    if (symbol) whereConditions.symbol = symbol
    if (fromTransactionDate) whereConditions.transactionDate = MoreThanOrEqual(new Date(fromTransactionDate))
    if (toTransactionDate) whereConditions.transactionDate = LessThanOrEqual(new Date(toTransactionDate))

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

    const [coinTransactions, total] = await this.coinTransactionRepository.findAndCount({
      where: whereConditions,
      skip,
      take,
      order,
    })

    const totalPages = Math.ceil(total / take)

    return {
      edges: coinTransactions,
      pageInfo: {
        total,
        page,
        take,
        hasNextPage: page < totalPages,
        totalPages,
      },
    }
  }

  async coinTransaction(jwtPayload: JwtPayload, id: number) {
    const coinTransaction = await this.coinTransactionRepository.findOne({ where: { id: id, isDelete: false } })
    if (!coinTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_COIN_TRANSACTION)

    const existingAccount = await this.accountRepository.findOne({
      where: { id: coinTransaction.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    return coinTransaction
  }

  async updateCoinTransaction(jwtPayload: JwtPayload, updateCoinTransactionInput: UpdateCoinTransactionInput) {
    const cleanInput = await this.cleanUpdateCoinTransaction(jwtPayload, updateCoinTransactionInput)
    return this.txUpdateCoinTransaction(cleanInput)
  }

  private async cleanUpdateCoinTransaction(
    jwtPayload: JwtPayload,
    updateCoinTransactionInput: UpdateCoinTransactionInput,
  ) {
    const existingCoinTransaction = await this.coinTransactionRepository.findOne({
      where: { id: updateCoinTransactionInput.id, isDelete: false },
    })
    if (!existingCoinTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_COIN_TRANSACTION)

    const cleanInput = await this.commonCheckCoinTransaction(jwtPayload, {
      ...updateCoinTransactionInput,
      symbol: existingCoinTransaction.symbol,
      accountId: existingCoinTransaction.accountId,
    })

    const sign = cleanInput.type || existingCoinTransaction.type === TransactionType.DEPOSIT ? 1 : -1
    const deleteSign = existingCoinTransaction.type === TransactionType.DEPOSIT ? -1 : 1

    const coinSummary = cleanInput.existSummary.coin

    if (cleanInput.isDelete) {
      coinSummary.quantity = coinSummary.quantity + deleteSign * existingCoinTransaction.quantity
      coinSummary.amount = coinSummary.amount + deleteSign * existingCoinTransaction.amount
    } else {
      coinSummary.quantity =
        coinSummary.quantity + sign * cleanInput.quantity + deleteSign * existingCoinTransaction.quantity
      coinSummary.amount = coinSummary.amount + sign * cleanInput.amount + deleteSign * existingCoinTransaction.amount
    }

    return { ...updateCoinTransactionInput, ...cleanInput, existingCoinTransaction }
  }

  private txUpdateCoinTransaction(
    cleanInput: UpdateCoinTransactionInput & {
      existSummary: { cash: any; coin: any }
    } & { existingCoinTransaction: CoinTransaction },
  ) {
    return this.coinTransactionRepository.manager.transaction(async (manager) => {
      const { existSummary, existingCoinTransaction, ...input } = cleanInput

      const updatedCoinTransaction = manager.merge(CoinTransaction, existingCoinTransaction, input)

      const coinTransaction = await manager.save(CoinTransaction, updatedCoinTransaction)

      await manager.upsert(CoinSummary, existSummary.coin, ["accountId", "type", "symbol", "currency"])

      return coinTransaction
    })
  }
}
