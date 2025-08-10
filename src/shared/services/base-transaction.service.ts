import { Injectable, Logger } from "@nestjs/common"
import { PrismaService } from "../../common/prisma"
import { JwtPayload, ValidationException, ForbiddenException, ErrorMessage } from "../../common"
import { UserRole } from "@prisma/client"

/**
 * Base Service for all transaction modules
 * Implements 3-step pattern: clean, transaction, post
 */
@Injectable()
export abstract class BaseTransactionService<TInput, TOutput> {
  protected abstract readonly logger: Logger
  
  protected constructor(protected readonly prisma: PrismaService) {}

  /**
   * Main entry point following 3-step pattern
   */
  async create(jwtPayload: JwtPayload, input: TInput): Promise<TOutput> {
    // Step 1: Clean and validate input
    const cleanedInput = await this.cleanInput(jwtPayload, input)
    
    // Step 2: Execute transaction
    const result = await this.txProcess(cleanedInput)
    
    // Step 3: Post-transaction operations
    return await this.postProcess(result)
  }

  /**
   * Update operation following 3-step pattern
   */
  async update(jwtPayload: JwtPayload, input: TInput): Promise<TOutput> {
    // Step 1: Clean and validate input
    const cleanedInput = await this.cleanUpdateInput(jwtPayload, input)
    
    // Step 2: Execute transaction
    const result = await this.txUpdate(cleanedInput)
    
    // Step 3: Post-transaction operations
    return await this.postProcess(result)
  }

  /**
   * Delete operation following 3-step pattern (soft delete)
   */
  async delete(jwtPayload: JwtPayload, id: number): Promise<TOutput> {
    // Step 1: Validate permissions
    await this.validateDeletePermission(jwtPayload, id)
    
    // Step 2: Execute soft delete
    const result = await this.txSoftDelete(id)
    
    // Step 3: Post-deletion operations
    return await this.postDelete(result)
  }

  /**
   * Abstract methods to be implemented by child classes
   */
  protected abstract cleanInput(jwtPayload: JwtPayload, input: TInput): Promise<any>
  protected abstract cleanUpdateInput(jwtPayload: JwtPayload, input: TInput): Promise<any>
  protected abstract txProcess(cleanedInput: any): Promise<TOutput>
  protected abstract txUpdate(cleanedInput: any): Promise<TOutput>
  protected abstract txSoftDelete(id: number): Promise<TOutput>
  protected abstract postProcess(result: TOutput): Promise<TOutput>
  protected abstract postDelete(result: TOutput): Promise<TOutput>

  /**
   * Common validation for delete permission
   */
  protected async validateDeletePermission(jwtPayload: JwtPayload, id: number): Promise<void> {
    // Admin can delete anything
    if (jwtPayload.role === UserRole.ADMIN) {
      return
    }
    
    // Override in child class for specific validation
    throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)
  }

  /**
   * Common amount validation
   */
  protected validateAmount(amount: number): void {
    if (amount < 0) {
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)
    }
  }

  /**
   * Common date validation
   */
  protected validateDate(dateString: string): Date {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      throw new ValidationException("Invalid date format")
    }
    return date
  }
}