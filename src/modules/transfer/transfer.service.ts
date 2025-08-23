import { Injectable, Logger } from "@nestjs/common"
import { ErrorMessage, ForbiddenException, JwtPayload, ValidationException } from "../../common"
import { PrismaService } from "../../common/prisma"
import { AccountsByCurrencyInput, CreateTransferInput } from "./inputs"
import { AccountWithBalance, TransferResult, TransferTransaction } from "./models"
import { CleanedTransferInput } from "./types/cleaned-transfer-input.type"
import { AccountType, SummaryType, TransactionType, UserRole, Prisma } from "@prisma/client"
import { Decimal } from "@prisma/client/runtime/library"

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name)

  constructor(private readonly prisma: PrismaService) {}

  async getAccountsByCurrency(jwtPayload: JwtPayload, input: AccountsByCurrencyInput): Promise<AccountWithBalance[]> {
    // Get all accounts for the user (or all accounts if admin)
    const whereClause: any = { isDelete: false }
    if (jwtPayload.role !== UserRole.ADMIN) {
      whereClause.userId = jwtPayload.id
    }

    const accounts = await this.prisma.account.findMany({
      where: whereClause,
    })

    // Get accounts with matching currency
    const accountsWithBalance: AccountWithBalance[] = []

    for (const account of accounts) {
      const summary = await this.getAccountSummary(account)
      if (!summary) continue

      const currency = this.getAccountCurrency(account.type, summary)
      if (currency !== input.currency) continue

      const balance = this.getAccountBalance(account.type, summary)

      accountsWithBalance.push({
        id: account.id,
        nickName: account.nickName,
        type: account.type,
        currency: currency as any,
        balance: Number(balance),
        isDelete: account.isDelete,
      })
    }

    // Sort by balance descending
    accountsWithBalance.sort((a, b) => b.balance - a.balance)

    return accountsWithBalance
  }

  async transferBalance(jwtPayload: JwtPayload, input: CreateTransferInput): Promise<TransferResult> {
    // Step 1: Validate and clean input
    const cleanedInput = await this.cleanTransferInput(jwtPayload, input)

    // Step 2: Execute transaction
    const result = await this.txTransferBalance(cleanedInput)

    // Step 3: Post-transaction operations
    return await this.postTransferOperation(result, cleanedInput)
  }

  private async cleanTransferInput(jwtPayload: JwtPayload, input: CreateTransferInput): Promise<CleanedTransferInput> {
    // Validate amount
    if (input.amount <= 0) {
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)
    }

    // Prevent same account transfer
    if (input.fromAccountId === input.toAccountId) {
      throw new ValidationException(ErrorMessage.MSG_SAME_ACCOUNT_TRANSFER)
    }

    // Get both accounts
    const [fromAccount, toAccount] = await Promise.all([
      this.prisma.account.findUnique({
        where: { id: input.fromAccountId },
      }),
      this.prisma.account.findUnique({
        where: { id: input.toAccountId },
      }),
    ])

    if (!fromAccount || !toAccount) {
      throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    }

    // Check permissions (both accounts must belong to user or user must be admin)
    if (jwtPayload.role !== UserRole.ADMIN) {
      if (fromAccount.userId !== jwtPayload.id || toAccount.userId !== jwtPayload.id) {
        throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)
      }
    }

    // Get summaries based on account type
    const fromSummary = await this.getAccountSummary(fromAccount)
    const toSummary = await this.getAccountSummary(toAccount)

    if (!fromSummary || !toSummary) {
      throw new ValidationException(ErrorMessage.MSG_NOT_CASH_TYPE_SUMMARY)
    }

    // Check currency match
    const fromCurrency = this.getAccountCurrency(fromAccount.type, fromSummary)
    const toCurrency = this.getAccountCurrency(toAccount.type, toSummary)

    if (fromCurrency !== toCurrency) {
      throw new ValidationException(ErrorMessage.MSG_CURRENCY_MISMATCH)
    }

    // Check sufficient balance
    const fromBalance = this.getAccountBalance(fromAccount.type, fromSummary)
    if (fromBalance.lessThan(input.amount)) {
      throw new ValidationException(ErrorMessage.MSG_INSUFFICIENT_BALANCE)
    }

    return {
      ...input,
      fromAccount,
      toAccount,
      fromSummary,
      toSummary,
    }
  }

  private async getAccountSummary(account: any) {
    switch (account.type) {
      case AccountType.BANK:
        return this.prisma.bankSummary.findUnique({
          where: { accountId: account.id },
        })
      case AccountType.STOCK:
        return this.prisma.stockSummary.findFirst({
          where: {
            accountId: account.id,
            type: SummaryType.CASH,
            isDelete: false,
          },
        })
      case AccountType.COIN:
        return this.prisma.coinSummary.findFirst({
          where: {
            accountId: account.id,
            type: SummaryType.CASH,
            isDelete: false,
          },
        })
      default:
        return null
    }
  }

  private getAccountBalance(accountType: AccountType, summary: any): Decimal {
    if (accountType === AccountType.BANK) {
      return new Decimal(summary.balance)
    } else {
      return new Decimal(summary.amount)
    }
  }

  private getAccountCurrency(accountType: AccountType, summary: any): string {
    return summary.currency
  }

  private async txTransferBalance(
    cleanedInput: CleanedTransferInput,
  ): Promise<{ fromTransaction: any; toTransaction: any }> {
    return this.prisma.$transaction(async (tx) => {
      const { fromAccount, toAccount, amount, transactionDate, description } = cleanedInput

      // Create withdrawal transaction
      const fromTransaction = await this.createWithdrawalTransaction(
        tx,
        fromAccount,
        toAccount,
        amount,
        transactionDate,
        description,
      )

      // Create deposit transaction
      const toTransaction = await this.createDepositTransaction(
        tx,
        toAccount,
        fromAccount,
        amount,
        transactionDate,
        description,
      )

      // Update summaries
      await this.updateSummaries(
        tx,
        cleanedInput.fromAccount,
        cleanedInput.toAccount,
        cleanedInput.fromSummary,
        cleanedInput.toSummary,
        amount,
      )

      return { fromTransaction, toTransaction }
    })
  }

  private async createWithdrawalTransaction(
    tx: Prisma.TransactionClient,
    fromAccount: any,
    toAccount: any,
    amount: number,
    transactionDate: Date,
    description?: string,
  ) {
    const withdrawalDesc = description || `Transfer to ${toAccount.nickName}`

    switch (fromAccount.type) {
      case AccountType.BANK:
        return tx.bankTransaction.create({
          data: {
            accountId: fromAccount.id,
            amount: new Decimal(amount),
            type: TransactionType.WITHDRAWAL,
            transactionDate,
            name: withdrawalDesc,
            currency: (fromAccount as any).currency,
          },
        })
      case AccountType.STOCK:
        return tx.stockTransaction.create({
          data: {
            accountId: fromAccount.id,
            symbol: "TRANSFER",
            amount: new Decimal(amount),
            quantity: new Decimal(0),
            price: new Decimal(0),
            fee: new Decimal(0),
            type: TransactionType.SELL,
            transactionDate,
            name: withdrawalDesc,
          },
        })
      case AccountType.COIN:
        return tx.coinTransaction.create({
          data: {
            accountId: fromAccount.id,
            symbol: "TRANSFER",
            amount: new Decimal(amount),
            quantity: new Decimal(0),
            price: new Decimal(0),
            fee: new Decimal(0),
            type: TransactionType.SELL,
            transactionDate,
            name: withdrawalDesc,
          },
        })
      default:
        throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    }
  }

  private async createDepositTransaction(
    tx: Prisma.TransactionClient,
    toAccount: any,
    fromAccount: any,
    amount: number,
    transactionDate: Date,
    description?: string,
  ) {
    const depositDesc = description || `Transfer from ${fromAccount.nickName}`

    switch (toAccount.type) {
      case AccountType.BANK:
        return tx.bankTransaction.create({
          data: {
            accountId: toAccount.id,
            amount: new Decimal(amount),
            type: TransactionType.DEPOSIT,
            transactionDate,
            name: depositDesc,
            currency: (toAccount as any).currency,
          },
        })
      case AccountType.STOCK:
        return tx.stockTransaction.create({
          data: {
            accountId: toAccount.id,
            symbol: "TRANSFER",
            amount: new Decimal(amount),
            quantity: new Decimal(0),
            price: new Decimal(0),
            fee: new Decimal(0),
            type: TransactionType.BUY,
            transactionDate,
            name: depositDesc,
          },
        })
      case AccountType.COIN:
        return tx.coinTransaction.create({
          data: {
            accountId: toAccount.id,
            symbol: "TRANSFER",
            amount: new Decimal(amount),
            quantity: new Decimal(0),
            price: new Decimal(0),
            fee: new Decimal(0),
            type: TransactionType.BUY,
            transactionDate,
            name: depositDesc,
          },
        })
      default:
        throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    }
  }

  private async updateSummaries(
    tx: Prisma.TransactionClient,
    fromAccount: any,
    toAccount: any,
    fromSummary: any,
    toSummary: any,
    amount: number,
  ) {
    // Update from account summary
    switch (fromAccount.type) {
      case AccountType.BANK:
        await tx.bankSummary.update({
          where: { id: fromSummary.id },
          data: {
            balance: {
              decrement: amount,
            },
            totalWithdrawalAmount: {
              increment: amount,
            },
          },
        })
        break
      case AccountType.STOCK:
        await tx.stockSummary.update({
          where: { id: fromSummary.id },
          data: {
            amount: {
              decrement: amount,
            },
          },
        })
        break
      case AccountType.COIN:
        await tx.coinSummary.update({
          where: { id: fromSummary.id },
          data: {
            amount: {
              decrement: amount,
            },
          },
        })
        break
    }

    // Update to account summary
    switch (toAccount.type) {
      case AccountType.BANK:
        await tx.bankSummary.update({
          where: { id: toSummary.id },
          data: {
            balance: {
              increment: amount,
            },
            totalDepositAmount: {
              increment: amount,
            },
          },
        })
        break
      case AccountType.STOCK:
        await tx.stockSummary.update({
          where: { id: toSummary.id },
          data: {
            amount: {
              increment: amount,
            },
          },
        })
        break
      case AccountType.COIN:
        await tx.coinSummary.update({
          where: { id: toSummary.id },
          data: {
            amount: {
              increment: amount,
            },
          },
        })
        break
    }
  }

  private async postTransferOperation(
    result: { fromTransaction: any; toTransaction: any },
    cleanedInput: CleanedTransferInput,
  ): Promise<TransferResult> {
    // Log the transfer
    this.logger.log({
      event: "balance_transfer",
      fromAccountId: cleanedInput.fromAccountId,
      toAccountId: cleanedInput.toAccountId,
      amount: cleanedInput.amount,
      timestamp: new Date().toISOString(),
    })

    // Map transactions to response format
    const fromTransferTransaction: TransferTransaction = {
      id: result.fromTransaction.id,
      accountId: result.fromTransaction.accountId,
      amount: Number(result.fromTransaction.amount),
      type: result.fromTransaction.type,
      transactionDate: result.fromTransaction.transactionDate,
      description: result.fromTransaction.name || "",
    }

    const toTransferTransaction: TransferTransaction = {
      id: result.toTransaction.id,
      accountId: result.toTransaction.accountId,
      amount: Number(result.toTransaction.amount),
      type: result.toTransaction.type,
      transactionDate: result.toTransaction.transactionDate,
      description: result.toTransaction.name || "",
    }

    return {
      success: true,
      fromTransaction: fromTransferTransaction,
      toTransaction: toTransferTransaction,
      message: "이체가 성공적으로 완료되었습니다.",
    }
  }
}
