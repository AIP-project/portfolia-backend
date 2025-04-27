import { Injectable, Logger } from "@nestjs/common"
import {
  AccountType,
  ErrorMessage,
  ForbiddenException,
  JwtPayload,
  parseISOString,
  TransactionType,
  UserRole,
  ValidationException,
} from "../common"
import {
  BankTransactionInput,
  BankTransactionsArgs,
  CreateBankTransactionInput,
  UpdateBankTransactionInput,
} from "./dto"
import { InjectRepository } from "@nestjs/typeorm"
import { FindOptionsWhere, ILike, LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm"
import { Account } from "../account/entities/account.entity"
import { BankTransaction } from "./entities"
import { BankSummary } from "../bank-summary/entities"

@Injectable()
export class BankTransactionService {
  private readonly logger = new Logger(BankTransactionService.name)

  constructor(
    @InjectRepository(BankTransaction) private readonly bankTransactionRepository: Repository<BankTransaction>,
    @InjectRepository(BankSummary) private readonly bankSummaryRepository: Repository<BankSummary>,
    @InjectRepository(Account) private readonly accountRepository: Repository<Account>,
  ) {}

  private async commonCheckBankTransaction(jwtPayload: JwtPayload, bankTransactionInput: BankTransactionInput) {
    const cleanInput = new BankTransactionInput()
    if (bankTransactionInput.amount < 0)
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)

    if (bankTransactionInput.transactionDate) parseISOString(bankTransactionInput.transactionDate)

    const existingAccount = await this.accountRepository.findOne({
      where: { id: bankTransactionInput.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.type !== AccountType.BANK) throw new ValidationException(ErrorMessage.MSG_NOT_BANK_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    const existSummary = await this.bankSummaryRepository.findOne({
      where: { accountId: bankTransactionInput.accountId },
    })

    if (!existSummary) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_BANK_SUMMARY)

    return { ...bankTransactionInput, ...cleanInput, existSummary }
  }

  async createBankTransaction(jwtPayload: JwtPayload, createBankTransactionInput: CreateBankTransactionInput) {
    const cleanInput = await this.cleanBankTransaction(jwtPayload, createBankTransactionInput)
    return this.txCreateBankTransaction(cleanInput)
  }

  private async cleanBankTransaction(jwtPayload: JwtPayload, createBankTransactionInput: CreateBankTransactionInput) {
    const cleanInput = await this.commonCheckBankTransaction(jwtPayload, createBankTransactionInput)

    if (cleanInput.type === TransactionType.DEPOSIT) {
      cleanInput.existSummary.totalDepositAmount += cleanInput.amount
      cleanInput.existSummary.balance += cleanInput.amount
    } else {
      cleanInput.existSummary.totalWithdrawalAmount += cleanInput.amount
      cleanInput.existSummary.balance -= cleanInput.amount
    }

    return { ...createBankTransactionInput, ...cleanInput }
  }

  private async txCreateBankTransaction(cleanInput: CreateBankTransactionInput & { existSummary: BankSummary }) {
    return this.bankTransactionRepository.manager.transaction(async (manager) => {
      const { existSummary, ...input } = cleanInput
      const bankTransaction = await manager.save(BankTransaction, input)

      await manager.update(
        BankSummary,
        {
          accountId: bankTransaction.accountId,
        },
        {
          ...existSummary,
        },
      )

      return bankTransaction
    })
  }

  async bankTransactions(jwtPayload: JwtPayload, bankTransactionsArgs: BankTransactionsArgs) {
    const {
      page = 1,
      take = 10,
      sortBy,
      name,
      type,
      note,
      fromTransactionDate,
      toTransactionDate,
      accountId,
    } = bankTransactionsArgs
    const skip = (page - 1) * take

    const existingAccount = await this.accountRepository.findOne({
      where: { id: accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    const whereConditions: FindOptionsWhere<BankTransaction> = {
      isDelete: false,
      accountId,
    }

    if (name) whereConditions.name = ILike(`%${name}%`)
    if (note) whereConditions.note = ILike(`%${note}%`)
    if (type) whereConditions.type = type
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

    const [bankTransactions, total] = await this.bankTransactionRepository.findAndCount({
      where: whereConditions,
      skip,
      take,
      order,
    })

    const totalPages = Math.ceil(total / take)

    return {
      edges: bankTransactions,
      pageInfo: {
        total,
        page,
        take,
        hasNextPage: page < totalPages,
        totalPages,
      },
    }
  }

  async bankTransaction(jwtPayload: JwtPayload, id: number) {
    const bankTransaction = await this.bankTransactionRepository.findOne({ where: { id: id, isDelete: false } })
    if (!bankTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_BANK_TRANSACTION)

    const existingAccount = await this.accountRepository.findOne({
      where: { id: bankTransaction.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    return bankTransaction
  }

  async updateBankTransaction(jwtPayload: JwtPayload, updateBankTransactionInput: UpdateBankTransactionInput) {
    const cleanInput = await this.cleanUpdateBankTransaction(jwtPayload, updateBankTransactionInput)
    return this.txUpdateBankTransaction(cleanInput)
  }

  private async cleanUpdateBankTransaction(
    jwtPayload: JwtPayload,
    updateBankTransactionInput: UpdateBankTransactionInput,
  ) {
    const existingBankTransaction = await this.bankTransactionRepository.findOne({
      where: { id: updateBankTransactionInput.id, isDelete: false },
    })
    if (!existingBankTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_BANK_TRANSACTION)

    const cleanInput = await this.commonCheckBankTransaction(jwtPayload, {
      ...updateBankTransactionInput,
      accountId: existingBankTransaction.accountId,
    })

    if (cleanInput.isDelete) {
      if (existingBankTransaction.type === TransactionType.DEPOSIT) {
        cleanInput.existSummary.totalDepositAmount -= existingBankTransaction.amount
        cleanInput.existSummary.balance -= existingBankTransaction.amount
      } else {
        cleanInput.existSummary.totalWithdrawalAmount -= existingBankTransaction.amount
        cleanInput.existSummary.balance += existingBankTransaction.amount
      }
    } else {
      if (cleanInput.type === TransactionType.DEPOSIT) {
        cleanInput.existSummary.totalDepositAmount += cleanInput.amount - existingBankTransaction.amount
        cleanInput.existSummary.balance += cleanInput.amount - existingBankTransaction.amount
      } else {
        cleanInput.existSummary.totalWithdrawalAmount += cleanInput.amount - existingBankTransaction.amount
        cleanInput.existSummary.balance -= cleanInput.amount - existingBankTransaction.amount
      }
    }

    return { ...updateBankTransactionInput, ...cleanInput, existingBankTransaction }
  }

  private async txUpdateBankTransaction(
    cleanInput: UpdateBankTransactionInput & { existingBankTransaction: BankTransaction } & {
      existSummary: BankSummary
    },
  ) {
    return this.bankTransactionRepository.manager.transaction(async (manager) => {
      const { existingBankTransaction, existSummary, ...input } = cleanInput

      const updatedBankTransaction = manager.merge(BankTransaction, existingBankTransaction, input)

      const bankTransaction = await manager.save(BankTransaction, updatedBankTransaction)

      await manager.update(
        BankSummary,
        {
          accountId: bankTransaction.accountId,
        },
        {
          ...existSummary,
        },
      )
      return bankTransaction
    })
  }
}
