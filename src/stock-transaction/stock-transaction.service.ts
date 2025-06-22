import { Injectable, Logger } from "@nestjs/common"
import {
  AccountType,
  ErrorMessage,
  ExternalServiceException,
  ForbiddenException,
  InterfaceConfig,
  JwtPayload,
  parseISOString,
  SummaryType,
  TransactionType,
  UserRole,
  ValidationException,
} from "../common"
import {
  CreateStockTransactionInput,
  StockTransactionInput,
  StockTransactionsArgs,
  UpdateStockTransactionInput,
} from "./dto"
import { HttpService } from "@nestjs/axios"
import { firstValueFrom } from "rxjs"
import { AxiosError } from "axios"
import { catchError, map } from "rxjs/operators"
import { ConfigService } from "@nestjs/config"
import { PrismaService } from "../common/prisma"
import { Decimal } from "@prisma/client/runtime/library"

@Injectable()
export class StockTransactionService {
  private readonly logger = new Logger(StockTransactionService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private async commonCheckStockTransaction(jwtPayload: JwtPayload, stockTransactionInput: StockTransactionInput) {
    const cleanInput = new StockTransactionInput()
    if (stockTransactionInput.quantity < 0)
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)

    if (stockTransactionInput.amount < 0)
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)

    if (stockTransactionInput.transactionDate) parseISOString(stockTransactionInput.transactionDate)

    const existingAccount = await this.prisma.account.findUnique({
      where: { id: stockTransactionInput.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.type !== AccountType.STOCK) throw new ValidationException(ErrorMessage.MSG_NOT_STOCK_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    const existCashSummary = await this.prisma.stockSummary.findFirst({
      where: { accountId: stockTransactionInput.accountId, type: SummaryType.CASH, isDelete: false },
    })

    if (!existCashSummary) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_STOCK_SUMMARY)

    const existStockSummary = await this.prisma.stockSummary.findFirst({
      where: {
        accountId: stockTransactionInput.accountId,
        type: SummaryType.SUMMARY,
        symbol: stockTransactionInput.symbol,
        isDelete: false,
      },
    })

    if (existStockSummary) {
      cleanInput.name = stockTransactionInput.name
      cleanInput.currency = existStockSummary.currency
      existStockSummary.name = stockTransactionInput.name
    }

    const existSummary = {
      cash: existCashSummary,
      stock: existStockSummary,
    }

    return {
      ...stockTransactionInput,
      ...cleanInput,
      existSummary,
    }
  }

  async createStockTransaction(jwtPayload: JwtPayload, createStockTransactionInput: CreateStockTransactionInput) {
    const cleanInput = await this.cleanStockTransaction(jwtPayload, createStockTransactionInput)

    const sign = cleanInput.type === TransactionType.DEPOSIT ? 1 : -1

    const stockSummary = cleanInput.existSummary.stock

    if (stockSummary) {
      stockSummary.quantity = new Decimal(Number(stockSummary.quantity) + sign * Number(cleanInput.quantity))
      stockSummary.amount = new Decimal(Number(stockSummary.amount) + sign * Number(cleanInput.amount))
    } else {
      cleanInput.existSummary.stock = {
        name: cleanInput.name,
        symbol: cleanInput.symbol,
        quantity: new Decimal(sign * Number(cleanInput.quantity)),
        amount: new Decimal(sign * Number(cleanInput.amount)),
        type: SummaryType.SUMMARY,
        accountId: cleanInput.accountId,
      }
    }

    const isUpdate = !!cleanInput.existSummary.stock.id
    const result = await this.txCreateStockTransaction(cleanInput)
    this.postCreateStockTransaction(result, isUpdate).then((value) =>
      this.logger.debug(`Post create stock transaction: ${value}`),
    )
    return result
  }

  private async cleanStockTransaction(
    jwtPayload: JwtPayload,
    createStockTransactionInput: CreateStockTransactionInput,
  ) {
    const cleanInput = await this.commonCheckStockTransaction(jwtPayload, createStockTransactionInput)

    return { ...createStockTransactionInput, ...cleanInput }
  }

  private async txCreateStockTransaction(
    cleanInput: CreateStockTransactionInput & {
      existSummary: { cash: any; stock: any }
    },
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const { existSummary, ...input } = cleanInput

      const stockTransaction = await prisma.stockTransaction.create({ data: input })

      await prisma.stockSummary.upsert({
        where: {
          accountId_type_symbol: {
            accountId: existSummary.stock.accountId,
            type: existSummary.stock.type,
            symbol: existSummary.stock.symbol,
          },
        },
        update: existSummary.stock,
        create: existSummary.stock,
      })

      return stockTransaction
    })
  }

  private async postCreateStockTransaction(result: any, isUpdate: boolean) {
    const { symbol } = result
    if (!isUpdate) {
      const interfaceConfig = this.configService.get<InterfaceConfig>("interface")!
      const payload = {
        query: symbol,
        sections: [
          {
            type: "PRODUCT",
          },
        ],
      }
      try {
        const response = await firstValueFrom(
          this.httpService
            .post(interfaceConfig.stockSearchApiUrl, payload, {
              headers: {
                "Content-Type": "application/json",
              },
            })
            .pipe(
              map((res) => res.data),
              catchError((error: AxiosError) => {
                this.logger.error(`Error searching for stock "${symbol}": ${error.message}`)
                throw new ExternalServiceException(`Failed to search stock: ${error.message}`)
              }),
            ),
        )

        for (const section of response.result) {
          if (section.type === "PRODUCT" && section.data) {
            for (const data of section.data.items) {
              if (data.symbol === symbol) {
                this.logger.log(`Found stock: ${data.keyword} ${data.productCode} (${data.symbol})`)
                const stockInfos = await firstValueFrom(
                  this.httpService.get(`${interfaceConfig.stockInfoApiUrl}${data.productCode}`).pipe(
                    map((res) => res.data),
                    catchError((error: AxiosError) => {
                      this.logger.error(`Error searching for stock "${symbol}": ${error.message}`)
                      throw new ExternalServiceException(`Failed to search stock: ${error.message}`)
                    }),
                  ),
                )
                const stockInfo = stockInfos.result[0]
                this.prisma.stockSummary
                  .updateMany({
                    where: {
                      symbol: symbol,
                      isDelete: false,
                    },
                    data: {
                      stockCompanyCode: stockInfo.code,
                      currency: stockInfo.currency,
                      market: stockInfo.market.code,
                      logoImageUrl: stockInfo.logoImageUrl,
                    },
                  })
                  .then((value) => {
                    this.logger.debug(`Updated stock summary: ${value.count}`)
                  })
                this.prisma.stockTransaction
                  .update({
                    where: {
                      id: result.id,
                    },
                    data: {
                      currency: stockInfo.currency,
                    },
                  })
                  .then((value) => {
                    this.logger.debug(`Updated stock transaction: 1`)
                  })
                return "success"
              }
            }
          }
        }

        return "fail"
      } catch (error) {
        this.logger.error(`Exception caught: ${error.message}`)
      }
    }
    return "No need to search"
  }

  async stockTransactions(jwtPayload: JwtPayload, stockTransactionsArgs: StockTransactionsArgs) {
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
    } = stockTransactionsArgs
    const skip = (page - 1) * take

    const existingAccount = await this.prisma.account.findUnique({
      where: { id: accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    const whereConditions: any = {
      isDelete: false,
      accountId,
    }

    if (name) whereConditions.name = { contains: name }
    if (symbol) whereConditions.symbol = symbol
    if (note) whereConditions.note = { contains: note }
    if (type) whereConditions.type = type
    if (fromTransactionDate && toTransactionDate) {
      whereConditions.transactionDate = {
        gte: new Date(fromTransactionDate),
        lte: new Date(toTransactionDate),
      }
    } else if (fromTransactionDate) {
      whereConditions.transactionDate = { gte: new Date(fromTransactionDate) }
    } else if (toTransactionDate) {
      whereConditions.transactionDate = { lte: new Date(toTransactionDate) }
    }

    // Order by 설정
    const orderBy =
      sortBy.length > 0
        ? sortBy.map(({ field, direction }) => ({
            [field]: direction ? "asc" : "desc",
          }))
        : [{ createdAt: "asc" }] // 기본 정렬

    const [stockTransactions, total] = await Promise.all([
      this.prisma.stockTransaction.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy,
      }),
      this.prisma.stockTransaction.count({ where: whereConditions }),
    ])

    const totalPages = Math.ceil(total / take)

    return {
      edges: stockTransactions,
      pageInfo: {
        total,
        page,
        take,
        hasNextPage: page < totalPages,
        totalPages,
      },
    }
  }

  async stockTransaction(jwtPayload: JwtPayload, id: number) {
    const stockTransaction = await this.prisma.stockTransaction.findFirst({ where: { id: id, isDelete: false } })
    if (!stockTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_STOCK_TRANSACTION)

    const existingAccount = await this.prisma.account.findUnique({
      where: { id: stockTransaction.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    return stockTransaction
  }

  async updateStockTransaction(jwtPayload: JwtPayload, updateStockTransactionInput: UpdateStockTransactionInput) {
    const cleanInput = await this.cleanUpdateStockTransaction(jwtPayload, updateStockTransactionInput)
    return this.txUpdateStockTransaction(cleanInput)
  }

  private async cleanUpdateStockTransaction(
    jwtPayload: JwtPayload,
    updateStockTransactionInput: UpdateStockTransactionInput,
  ) {
    const existingStockTransaction = await this.prisma.stockTransaction.findFirst({
      where: { id: updateStockTransactionInput.id, isDelete: false },
    })
    if (!existingStockTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_STOCK_TRANSACTION)

    const cleanInput = await this.commonCheckStockTransaction(jwtPayload, {
      ...updateStockTransactionInput,
      symbol: existingStockTransaction.symbol,
      accountId: existingStockTransaction.accountId,
    })

    const sign = cleanInput.type || existingStockTransaction.type === TransactionType.DEPOSIT ? 1 : -1
    const deleteSign = existingStockTransaction.type === TransactionType.DEPOSIT ? -1 : 1

    const stockSummary = cleanInput.existSummary.stock

    if (cleanInput.isDelete) {
      stockSummary.quantity = new Decimal(Number(stockSummary.quantity) + deleteSign * Number(existingStockTransaction.quantity))
      stockSummary.amount = new Decimal(Number(stockSummary.amount) + deleteSign * Number(existingStockTransaction.amount))
    } else {
      stockSummary.quantity = new Decimal(
        Number(stockSummary.quantity) + sign * Number(cleanInput.quantity) + deleteSign * Number(existingStockTransaction.quantity)
      )
      stockSummary.amount = new Decimal(
        Number(stockSummary.amount) + sign * Number(cleanInput.amount) + deleteSign * Number(existingStockTransaction.amount)
      )
    }

    return { ...updateStockTransactionInput, ...cleanInput, existingStockTransaction }
  }

  private txUpdateStockTransaction(
    cleanInput: UpdateStockTransactionInput & {
      existSummary: { cash: any; stock: any }
    } & { existingStockTransaction: any },
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const { existSummary, existingStockTransaction, ...input } = cleanInput

      const stockTransaction = await prisma.stockTransaction.update({
        where: { id: existingStockTransaction.id },
        data: input,
      })

      await prisma.stockSummary.upsert({
        where: {
          accountId_type_symbol: {
            accountId: existSummary.stock.accountId,
            type: existSummary.stock.type,
            symbol: existSummary.stock.symbol,
          },
        },
        update: existSummary.stock,
        create: existSummary.stock,
      })

      return stockTransaction
    })
  }
}
