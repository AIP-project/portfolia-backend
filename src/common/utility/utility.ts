import crypto from "crypto"
import type { ValidationError } from "@nestjs/common"
import * as dayjs from "dayjs"
import * as utc from "dayjs/plugin/utc"
import * as timezone from "dayjs/plugin/timezone"
import { values } from "lodash"
import { SecurityConfig } from "../config"
import { ValidationException } from "../exception"
import { ErrorMessage } from "../constants"

dayjs.extend(utc)
dayjs.extend(timezone)

interface ErrorWithMessage {
  message: string
}

export const emailRuleCheck = (email: string): void => {
  const reg = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/
  if (!reg.test(email)) {
    throw new ValidationException(ErrorMessage.MSG_EMAIL_RULES_VIOLATION)
  }
}

export const passwordRuleCheck = (password: string): void => {
  const reg =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%^*#?&()`~\\|\-_=+{};:.,'/[\]"])[A-Za-z\d@$!%^*#?&()`~\\|\-_=+{};:.,'/[\]"]{8,30}$/g
  if (!reg.test(password)) {
    throw new ValidationException(ErrorMessage.MSG_PASSWORD_RULES_VIOLATION)
  }
}

export const isErrorWithMessage = (error: unknown): error is ErrorWithMessage => {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  )
}

export const toErrorWithMessage = (maybeError: unknown): ErrorWithMessage => {
  if (isErrorWithMessage(maybeError)) return maybeError

  try {
    return new Error(JSON.stringify(maybeError))
  } catch {
    return new Error(String(maybeError))
  }
}

export const getErrorMessage = (error: unknown): string => {
  return toErrorWithMessage(error).message
}

export const extractAllErrors = (e: ValidationError): string[] => {
  if (!!e.children && e.children.length) {
    const errors: string[] = []
    e.children.forEach((child) => {
      errors.push(...extractAllErrors(child).map((childErr) => `${e.property} => ${childErr}`))
    })
    return errors
  }
  return values(e.constraints)
}

export const encrypt = (text: string, { cryptoAlgorithm, cryptoSecretKey, cryptoIv }: SecurityConfig): string => {
  const cipher = crypto.createCipheriv(cryptoAlgorithm!, cryptoSecretKey!, cryptoIv!)
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])
  return encrypted.toString("hex")
}

export const decrypt = (
  encryptedText: string,
  { cryptoAlgorithm, cryptoSecretKey, cryptoIv }: SecurityConfig,
): string => {
  const decipher = crypto.createDecipheriv(cryptoAlgorithm!, cryptoSecretKey!, cryptoIv!)
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedText, "hex")), decipher.final()])
  return decrypted.toString()
}

export const parseISOString = (inputData: string | Date): Date => {
  let date: Date
  if (inputData instanceof Date) {
    date = inputData
  } else if (typeof inputData === "string") {
    try {
      date = new Date(inputData)
    } catch {
      throw new ValidationException(ErrorMessage.MSG_INVALID_DATE_FORMAT)
    }
    if (date.toISOString() !== inputData) throw new ValidationException(ErrorMessage.MSG_INVALID_DATE_FORMAT)
  }
  return date
}

export const addAmount = (amount1: number, amount2: number): number => {
  return parseFloat((amount1 + amount2).toFixed(6))
}
