import { Injectable } from "@nestjs/common"
import { AccountType, ErrorMessage, ForbiddenException, JwtPayload, UserRole, ValidationException } from "../common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { BankSummary } from "./entities"
import { Account } from "../account/entities/account.entity"
import { UpdateBankSummaryInput } from "./dto"

@Injectable()
export class BankSummaryService {
  constructor(
    @InjectRepository(BankSummary) private readonly bankSummaryRepository: Repository<BankSummary>,
    @InjectRepository(Account) private readonly accountRepository: Repository<Account>,
  ) {}

  async updateBankSummary(jwtPayload: JwtPayload, updateBankSummaryInput: UpdateBankSummaryInput) {
    const cleanInput = await this.cleanUpdateBankSummary(jwtPayload, updateBankSummaryInput)
    return this.txUpdateBankSummary(cleanInput)
  }

  private async cleanUpdateBankSummary(jwtPayload: JwtPayload, updateBankSummaryInput: UpdateBankSummaryInput) {
    const existingBankSummary = await this.bankSummaryRepository.findOne({
      where: { id: updateBankSummaryInput.id },
    })
    if (!existingBankSummary) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_BANK_SUMMARY)

    const existingAccount = await this.accountRepository.findOne({
      where: { id: existingBankSummary.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.type !== AccountType.BANK) throw new ValidationException(ErrorMessage.MSG_NOT_BANK_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    return { ...updateBankSummaryInput, existingBankSummary }
  }

  private async txUpdateBankSummary(cleanInput: UpdateBankSummaryInput & { existingBankSummary: BankSummary }) {
    return this.bankSummaryRepository.manager.transaction(async (manager) => {
      const { existingBankSummary, ...input } = cleanInput

      const updatedBankSummary = manager.merge(BankSummary, existingBankSummary, input)

      return await manager.save(BankSummary, updatedBankSummary)
    })
  }
}
