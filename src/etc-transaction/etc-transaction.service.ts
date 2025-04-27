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
import { CreateEtcTransactionInput, EtcTransactionInput, EtcTransactionsArgs, UpdateEtcTransactionInput } from "./dto"
import { EtcTransaction } from "./entities"
import { EtcSummary } from "../etc-summary/entities"

@Injectable()
export class EtcTransactionService {
  private readonly logger = new Logger(EtcTransactionService.name)

  constructor(
    @InjectRepository(EtcTransaction) private readonly etcTransactionRepository: Repository<EtcTransaction>,
    @InjectRepository(EtcSummary) private readonly etcSummaryRepository: Repository<EtcSummary>,
    @InjectRepository(Account) private readonly accountRepository: Repository<Account>,
  ) {}

  private async commonCheckEtcTransaction(jwtPayload: JwtPayload, etcTransactionInput: EtcTransactionInput) {
    const cleanInput = new EtcTransactionInput()
    if (etcTransactionInput.purchasePrice < 0)
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)

    if (etcTransactionInput.currentPrice && etcTransactionInput.currentPrice < 0)
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)

    if (etcTransactionInput.transactionDate) parseISOString(etcTransactionInput.transactionDate)

    const existingAccount = await this.accountRepository.findOne({
      where: { id: etcTransactionInput.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.type !== AccountType.ETC) throw new ValidationException(ErrorMessage.MSG_NOT_ETC_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    const existSummary = await this.etcSummaryRepository.findOne({
      where: { accountId: etcTransactionInput.accountId },
    })

    if (!existSummary) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ETC_SUMMARY)

    return { ...etcTransactionInput, ...cleanInput, existSummary }
  }

  async createEtcTransaction(jwtPayload: JwtPayload, createEtcTransactionInput: CreateEtcTransactionInput) {
    const cleanInput = await this.cleanEtcTransaction(jwtPayload, createEtcTransactionInput)
    return this.txCreateEtcTransaction(cleanInput)
  }

  private async cleanEtcTransaction(jwtPayload: JwtPayload, createEtcTransactionInput: CreateEtcTransactionInput) {
    const cleanInput = await this.commonCheckEtcTransaction(jwtPayload, createEtcTransactionInput)

    cleanInput.existSummary.count += 1
    cleanInput.existSummary.purchasePrice += cleanInput.purchasePrice
    cleanInput.existSummary.currentPrice += cleanInput.currentPrice

    return { ...createEtcTransactionInput, ...cleanInput }
  }

  private async txCreateEtcTransaction(cleanInput: CreateEtcTransactionInput & { existSummary: EtcSummary }) {
    return this.etcTransactionRepository.manager.transaction(async (manager) => {
      const { existSummary, ...input } = cleanInput

      const etcTransaction = await manager.save(EtcTransaction, input)

      await manager.save(EtcSummary, existSummary)

      return etcTransaction
    })
  }

  async etcTransactions(jwtPayload: JwtPayload, etcTransactionsArgs: EtcTransactionsArgs) {
    const {
      page = 1,
      take = 10,
      sortBy,
      name,
      note,
      fromTransactionDate,
      toTransactionDate,
      accountId,
    } = etcTransactionsArgs
    const skip = (page - 1) * take

    const existingAccount = await this.accountRepository.findOne({
      where: { id: accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    const whereConditions: FindOptionsWhere<EtcTransaction> = {
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

    const [etcTransactions, total] = await this.etcTransactionRepository.findAndCount({
      where: whereConditions,
      skip,
      take,
      order,
    })

    const totalPages = Math.ceil(total / take)

    return {
      edges: etcTransactions,
      pageInfo: {
        total,
        page,
        take,
        hasNextPage: page < totalPages,
        totalPages,
      },
    }
  }

  async etcTransaction(jwtPayload: JwtPayload, id: number) {
    const etcTransaction = await this.etcTransactionRepository.findOne({ where: { id: id, isDelete: false } })
    if (!etcTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_ETC_TRANSACTION)

    const existingAccount = await this.accountRepository.findOne({
      where: { id: etcTransaction.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    return etcTransaction
  }

  async updateEtcTransaction(jwtPayload: JwtPayload, updateEtcTransactionInput: UpdateEtcTransactionInput) {
    const cleanInput = await this.cleanUpdateEtcTransaction(jwtPayload, updateEtcTransactionInput)
    return this.txUpdateEtcTransaction(cleanInput)
  }

  private async cleanUpdateEtcTransaction(
    jwtPayload: JwtPayload,
    updateEtcTransactionInput: UpdateEtcTransactionInput,
  ) {
    const existingEtcTransaction = await this.etcTransactionRepository.findOne({
      where: { id: updateEtcTransactionInput.id, isDelete: false },
    })
    if (!existingEtcTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_ETC_TRANSACTION)

    const cleanInput = await this.commonCheckEtcTransaction(jwtPayload, {
      ...updateEtcTransactionInput,
      accountId: existingEtcTransaction.accountId,
    })

    if (cleanInput.isDelete) {
      cleanInput.existSummary.count -= 1
      cleanInput.existSummary.purchasePrice -= existingEtcTransaction.purchasePrice
      cleanInput.existSummary.currentPrice -= existingEtcTransaction.currentPrice
    } else {
      cleanInput.existSummary.purchasePrice += cleanInput.purchasePrice - existingEtcTransaction.purchasePrice
      cleanInput.existSummary.currentPrice += cleanInput.currentPrice - existingEtcTransaction.currentPrice
    }

    return { ...updateEtcTransactionInput, ...cleanInput, existingEtcTransaction }
  }

  private txUpdateEtcTransaction(
    cleanInput: UpdateEtcTransactionInput & { existSummary: EtcSummary } & {
      existingEtcTransaction: EtcTransaction
    },
  ) {
    return this.etcTransactionRepository.manager.transaction(async (manager) => {
      const { existingEtcTransaction, existSummary, ...input } = cleanInput

      const updatedEtcTransaction = manager.merge(EtcTransaction, existingEtcTransaction, input)

      const etcTransaction = await manager.save(EtcTransaction, updatedEtcTransaction)

      await manager.save(EtcSummary, existSummary)

      return etcTransaction
    })
  }
}
