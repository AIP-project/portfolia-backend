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
  UserRole,
  ValidationException,
} from "../common"
import {
  CreateLiabilitiesTransactionInput,
  LiabilitiesTransactionInput,
  LiabilitiesTransactionsArgs,
  UpdateLiabilitiesTransactionInput,
} from "./dto"
import { LiabilitiesTransaction } from "./entities"
import { LiabilitiesSummary } from "../liabilities-summary/entities"

@Injectable()
export class LiabilitiesTransactionService {
  private readonly logger = new Logger(LiabilitiesTransactionService.name)

  constructor(
    @InjectRepository(LiabilitiesTransaction)
    private readonly liabilitiesTransactionRepository: Repository<LiabilitiesTransaction>,
    @InjectRepository(LiabilitiesSummary) private readonly liabilitiesSummaryRepository: Repository<LiabilitiesSummary>,
    @InjectRepository(Account) private readonly accountRepository: Repository<Account>,
  ) {}

  private async commonCheckLiabilitiesTransaction(
    jwtPayload: JwtPayload,
    liabilitiesTransactionInput: LiabilitiesTransactionInput,
  ) {
    const cleanInput = new LiabilitiesTransactionInput()
    if (liabilitiesTransactionInput.amount < 0)
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)

    if (liabilitiesTransactionInput.remainingAmount && liabilitiesTransactionInput.remainingAmount < 0)
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)

    if (liabilitiesTransactionInput.transactionDate) parseISOString(liabilitiesTransactionInput.transactionDate)

    if (liabilitiesTransactionInput.accountId) {
      const existingAccount = await this.accountRepository.findOne({
        where: { id: liabilitiesTransactionInput.accountId },
      })
      if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
      if (existingAccount.type !== AccountType.LIABILITIES)
        throw new ValidationException(ErrorMessage.MSG_NOT_LIABILITIES_ACCOUNT)
      if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
        throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)
    }

    const existSummary = await this.liabilitiesSummaryRepository.findOne({
      where: { accountId: liabilitiesTransactionInput.accountId },
    })

    if (!existSummary) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_LIABILITIES_SUMMARY)

    return { ...liabilitiesTransactionInput, ...cleanInput, existSummary }
  }

  async createLiabilitiesTransaction(
    jwtPayload: JwtPayload,
    createLiabilitiesTransactionInput: CreateLiabilitiesTransactionInput,
  ) {
    const cleanInput = await this.cleanLiabilitiesTransaction(jwtPayload, createLiabilitiesTransactionInput)
    return this.txCreateLiabilitiesTransaction(cleanInput)
  }

  private async cleanLiabilitiesTransaction(
    jwtPayload: JwtPayload,
    createLiabilitiesTransactionInput: CreateLiabilitiesTransactionInput,
  ) {
    const cleanInput = await this.commonCheckLiabilitiesTransaction(jwtPayload, createLiabilitiesTransactionInput)

    cleanInput.existSummary.count += 1
    cleanInput.existSummary.amount += cleanInput.amount
    cleanInput.existSummary.remainingAmount += cleanInput.remainingAmount

    return { ...createLiabilitiesTransactionInput, ...cleanInput }
  }

  private async txCreateLiabilitiesTransaction(
    cleanInput: CreateLiabilitiesTransactionInput & {
      existSummary: LiabilitiesSummary
    },
  ) {
    return this.liabilitiesTransactionRepository.manager.transaction(async (manager) => {
      const { existSummary, ...input } = cleanInput

      const liabilitiesTransaction = await manager.save(LiabilitiesTransaction, input)

      await manager.save(LiabilitiesSummary, existSummary)

      return liabilitiesTransaction
    })
  }

  async liabilitiesTransactions(jwtPayload: JwtPayload, liabilitiesTransactionsArgs: LiabilitiesTransactionsArgs) {
    const {
      page = 1,
      take = 10,
      sortBy,
      name,
      note,
      fromTransactionDate,
      toTransactionDate,
      accountId,
    } = liabilitiesTransactionsArgs
    const skip = (page - 1) * take

    const existingAccount = await this.accountRepository.findOne({
      where: { id: accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    const whereConditions: FindOptionsWhere<LiabilitiesTransaction> = {
      isDelete: false,
      accountId,
    }

    if (name) whereConditions.name = ILike(`%${name}%`)
    if (note) whereConditions.note = ILike(`%${note}%`)
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

    const [liabilitiesTransactions, total] = await this.liabilitiesTransactionRepository.findAndCount({
      where: whereConditions,
      skip,
      take,
      order,
    })

    const totalPages = Math.ceil(total / take)

    return {
      edges: liabilitiesTransactions,
      pageInfo: {
        total,
        page,
        take,
        hasNextPage: page < totalPages,
        totalPages,
      },
    }
  }

  async liabilitiesTransaction(jwtPayload: JwtPayload, id: number) {
    const LiabilitiesTransaction = await this.liabilitiesTransactionRepository.findOne({
      where: { id: id, isDelete: false },
    })
    if (!LiabilitiesTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_ETC_TRANSACTION)

    const existingAccount = await this.accountRepository.findOne({
      where: { id: LiabilitiesTransaction.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    return LiabilitiesTransaction
  }

  async updateLiabilitiesTransaction(
    jwtPayload: JwtPayload,
    updateLiabilitiesTransactionInput: UpdateLiabilitiesTransactionInput,
  ) {
    const cleanInput = await this.cleanUpdateLiabilitiesTransaction(jwtPayload, updateLiabilitiesTransactionInput)
    return this.txUpdateLiabilitiesTransaction(cleanInput)
  }

  private async cleanUpdateLiabilitiesTransaction(
    jwtPayload: JwtPayload,
    updateLiabilitiesTransactionInput: UpdateLiabilitiesTransactionInput,
  ) {
    const existingLiabilitiesTransaction = await this.liabilitiesTransactionRepository.findOne({
      where: { id: updateLiabilitiesTransactionInput.id, isDelete: false },
    })
    if (!existingLiabilitiesTransaction)
      throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_LIABILITIES_TRANSACTION)

    const cleanInput = await this.commonCheckLiabilitiesTransaction(jwtPayload, {
      ...updateLiabilitiesTransactionInput,
      accountId: existingLiabilitiesTransaction.accountId,
    })

    if (cleanInput.isDelete) {
      cleanInput.existSummary.count -= 1
      cleanInput.existSummary.amount -= existingLiabilitiesTransaction.amount
      cleanInput.existSummary.remainingAmount -= existingLiabilitiesTransaction.remainingAmount
    } else {
      cleanInput.existSummary.amount += cleanInput.amount - existingLiabilitiesTransaction.amount
      cleanInput.existSummary.remainingAmount +=
        cleanInput.remainingAmount - existingLiabilitiesTransaction.remainingAmount
    }

    return { ...updateLiabilitiesTransactionInput, ...cleanInput, existingLiabilitiesTransaction }
  }

  private txUpdateLiabilitiesTransaction(
    cleanInput: UpdateLiabilitiesTransactionInput & {
      existSummary: LiabilitiesSummary
    } & {
      existingLiabilitiesTransaction: LiabilitiesTransaction
    },
  ) {
    return this.liabilitiesTransactionRepository.manager.transaction(async (manager) => {
      const { existingLiabilitiesTransaction, existSummary, ...input } = cleanInput

      const updatedLiabilitiesTransaction = manager.merge(LiabilitiesTransaction, existingLiabilitiesTransaction, input)

      const liabilitiesTransaction = await manager.save(LiabilitiesTransaction, updatedLiabilitiesTransaction)

      await manager.save(LiabilitiesSummary, existSummary)

      return liabilitiesTransaction
    })
  }
}
