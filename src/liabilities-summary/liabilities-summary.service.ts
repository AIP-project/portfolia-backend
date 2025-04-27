import { Injectable } from "@nestjs/common"
import { UpdateLiabilitiesSummaryInput } from "./dto"
import { AccountType, ErrorMessage, ForbiddenException, JwtPayload, UserRole, ValidationException } from "../common"
import { LiabilitiesSummary } from "./entities"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { Account } from "../account/entities/account.entity"

@Injectable()
export class LiabilitiesSummaryService {
  constructor(
    @InjectRepository(LiabilitiesSummary) private readonly liabilitiesSummaryRepository: Repository<LiabilitiesSummary>,
    @InjectRepository(Account) private readonly accountRepository: Repository<Account>,
  ) {}

  async updateLiabilitiesSummary(jwtPayload: JwtPayload, updateLiabilitiesSummaryInput: UpdateLiabilitiesSummaryInput) {
    const cleanInput = await this.cleanUpdateEtcSummary(jwtPayload, updateLiabilitiesSummaryInput)
    return this.txUpdateEtcSummary(cleanInput)
  }

  private async cleanUpdateEtcSummary(
    jwtPayload: JwtPayload,
    updateLiabilitiesSummaryInput: UpdateLiabilitiesSummaryInput,
  ) {
    const existingLiabilitiesSummary = await this.liabilitiesSummaryRepository.findOne({
      where: { id: updateLiabilitiesSummaryInput.id },
    })
    if (!existingLiabilitiesSummary) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_ETC_SUMMARY)

    const existingAccount = await this.accountRepository.findOne({
      where: { id: existingLiabilitiesSummary.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.type !== AccountType.LIABILITIES)
      throw new ValidationException(ErrorMessage.MSG_NOT_LIABILITIES_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    return { ...updateLiabilitiesSummaryInput, existingLiabilitiesSummary: existingLiabilitiesSummary }
  }

  private async txUpdateEtcSummary(
    cleanInput: UpdateLiabilitiesSummaryInput & { existingLiabilitiesSummary: LiabilitiesSummary },
  ) {
    return this.liabilitiesSummaryRepository.manager.transaction(async (manager) => {
      const { existingLiabilitiesSummary, ...input } = cleanInput

      const updatedLiabilitiesSummary = manager.merge(LiabilitiesSummary, existingLiabilitiesSummary, input)

      return await manager.save(LiabilitiesSummary, updatedLiabilitiesSummary)
    })
  }
}
