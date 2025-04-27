import { Injectable, Logger } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { FindOptionsWhere, ILike, LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm"
import { Account } from "../account/entities/account.entity"
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
import { StockSummary } from "../stock-summary/entities"
import { StockTransaction } from "./entities"
import { HttpService } from "@nestjs/axios"
import { firstValueFrom } from "rxjs"
import { AxiosError } from "axios"
import { catchError, map } from "rxjs/operators"
import { ConfigService } from "@nestjs/config"

@Injectable()
export class StockTransactionService {
  private readonly logger = new Logger(StockTransactionService.name)

  constructor(
    @InjectRepository(StockTransaction) private readonly stockTransactionRepository: Repository<StockTransaction>,
    @InjectRepository(StockSummary) private readonly stockSummaryRepository: Repository<StockSummary>,
    @InjectRepository(Account) private readonly accountRepository: Repository<Account>,
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

    const existingAccount = await this.accountRepository.findOne({
      where: { id: stockTransactionInput.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.type !== AccountType.STOCK) throw new ValidationException(ErrorMessage.MSG_NOT_STOCK_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    const existCashSummary = await this.stockSummaryRepository.findOne({
      where: { accountId: stockTransactionInput.accountId, type: SummaryType.CASH, isDelete: false },
    })

    if (!existCashSummary) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_STOCK_SUMMARY)

    const existStockSummary = await this.stockSummaryRepository.findOne({
      where: {
        accountId: stockTransactionInput.accountId,
        type: SummaryType.SUMMARY,
        symbol: stockTransactionInput.symbol,
        isDelete: false,
      },
    })

    if (existStockSummary) {
      cleanInput.name = existStockSummary.name
      cleanInput.currency = existStockSummary.currency
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
      stockSummary.quantity = stockSummary.quantity + sign * cleanInput.quantity
      stockSummary.amount = stockSummary.amount + sign * cleanInput.amount
    } else {
      cleanInput.existSummary.stock = {
        name: cleanInput.name,
        symbol: cleanInput.symbol,
        quantity: sign * cleanInput.quantity,
        amount: sign * cleanInput.amount,
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
    return this.stockTransactionRepository.manager.transaction(async (manager) => {
      const { existSummary, ...input } = cleanInput

      const stockTransaction = await manager.save(StockTransaction, input)

      await manager.upsert(StockSummary, existSummary.stock, ["accountId", "type", "symbol"])

      return stockTransaction
    })
  }

  private async postCreateStockTransaction(result: StockTransaction, isUpdate: boolean) {
    const { symbol } = result
    if (!isUpdate) {
      const interfaceConfig = this.configService.get<InterfaceConfig>("interface")!
      const payload = {
        query: symbol,
        sections: [
          {
            type: "PRODUCT",
            option: {
              addIntegratedSearchResult: true,
            },
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
                this.stockSummaryRepository
                  .update(
                    {
                      symbol: symbol,
                      isDelete: false,
                    },
                    {
                      name: stockInfo.name,
                      stockCompanyCode: stockInfo.code,
                      currency: stockInfo.currency,
                      market: stockInfo.market.code,
                      logoImageUrl: stockInfo.logoImageUrl,
                    },
                  )
                  .then((value) => {
                    this.logger.debug(`Updated stock summary: ${value.affected}`)
                  })
                this.stockTransactionRepository
                  .update(
                    {
                      id: result.id,
                    },
                    {
                      name: stockInfo.name,
                      currency: stockInfo.currency,
                    },
                  )
                  .then((value) => {
                    this.logger.debug(`Updated stock transaction: ${value.affected}`)
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

    const existingAccount = await this.accountRepository.findOne({
      where: { id: accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    const whereConditions: FindOptionsWhere<StockTransaction> = {
      isDelete: false,
      accountId,
    }

    if (name) whereConditions.name = ILike(`%${name}%`)
    if (symbol) whereConditions.symbol = symbol
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

    const [stockTransactions, total] = await this.stockTransactionRepository.findAndCount({
      where: whereConditions,
      skip,
      take,
      order,
    })

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
    const stockTransaction = await this.stockTransactionRepository.findOne({ where: { id: id, isDelete: false } })
    if (!stockTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_STOCK_TRANSACTION)

    const existingAccount = await this.accountRepository.findOne({
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
    const existingStockTransaction = await this.stockTransactionRepository.findOne({
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
      stockSummary.quantity = stockSummary.quantity + deleteSign * existingStockTransaction.quantity
      stockSummary.amount = stockSummary.amount + deleteSign * existingStockTransaction.amount
    } else {
      stockSummary.quantity =
        stockSummary.quantity + sign * cleanInput.quantity + deleteSign * existingStockTransaction.quantity
      stockSummary.amount =
        stockSummary.amount + sign * cleanInput.amount + deleteSign * existingStockTransaction.amount
    }

    return { ...updateStockTransactionInput, ...cleanInput, existingStockTransaction }
  }

  private txUpdateStockTransaction(
    cleanInput: UpdateStockTransactionInput & {
      existSummary: { cash: any; stock: any }
    } & { existingStockTransaction: StockTransaction },
  ) {
    return this.stockTransactionRepository.manager.transaction(async (manager) => {
      const { existSummary, existingStockTransaction, ...input } = cleanInput

      const updatedStockTransaction = manager.merge(StockTransaction, existingStockTransaction, input)

      const stockTransaction = await manager.save(StockTransaction, updatedStockTransaction)

      await manager.upsert(StockSummary, existSummary.stock, ["accountId", "type", "symbol"])

      return stockTransaction
    })
  }
}
