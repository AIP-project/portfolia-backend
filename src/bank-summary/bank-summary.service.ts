import { Injectable } from "@nestjs/common"
import { AccountType, ErrorMessage, ForbiddenException, JwtPayload, UserRole, ValidationException } from "../common"
import { PrismaService } from "../common/prisma"
import { UpdateBankSummaryInput } from "./dto"

@Injectable()
export class BankSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async updateBankSummary(jwtPayload: JwtPayload, updateBankSummaryInput: UpdateBankSummaryInput) {
    const cleanInput = await this.cleanUpdateBankSummary(jwtPayload, updateBankSummaryInput)
    return this.txUpdateBankSummary(cleanInput)
  }

  private async cleanUpdateBankSummary(jwtPayload: JwtPayload, updateBankSummaryInput: UpdateBankSummaryInput) {
    const existingBankSummary = await this.prisma.bankSummary.findUnique({
      where: { id: updateBankSummaryInput.id },
    })
    if (!existingBankSummary) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_BANK_SUMMARY)

    const existingAccount = await this.prisma.account.findUnique({
      where: { id: existingBankSummary.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.type !== AccountType.BANK) throw new ValidationException(ErrorMessage.MSG_NOT_BANK_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    return { ...updateBankSummaryInput, existingBankSummary }
  }

  private async txUpdateBankSummary(cleanInput: UpdateBankSummaryInput & { existingBankSummary: any }) {
    return this.prisma.$transaction(async (prisma) => {
      const { existingBankSummary, ...input } = cleanInput

      return prisma.bankSummary.update({
        where: { id: existingBankSummary.id },
        data: input,
      })
    })
  }
}
