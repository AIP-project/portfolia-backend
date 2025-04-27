export interface ConfigType {
  nest: NestConfig
  security: SecurityConfig
  database: DatabaseConfig
  interface: InterfaceConfig
  redis: RedisConfig
}

export interface NestConfig {
  port: number
  environment: string | undefined
}

export interface SecurityConfig {
  jwtAccessPrivateKey: string | undefined
  jwtAccessPublicKey: string | undefined
  jwtRefreshPrivateKey: string | undefined
  jwtRefreshPublicKey: string | undefined
  cryptoAlgorithm: string | undefined
  cryptoSecretKey: string | undefined
  cryptoIv: string | undefined
  jwtAccessExpiresIn: string | undefined
  jwtRefreshExpiresIn: string | undefined
}

export interface DatabaseConfig {
  host: string | undefined
  port: number | undefined
  username: string | undefined
  password: string | undefined
  name: string | undefined
  synchronize: boolean
}

export interface InterfaceConfig {
  stockSearchApiUrl: string
  stockInfoApiUrl: string
  stockPriceApiUrl: string
  coinMarketCapApiKey: string
  // coinInfoApiUrl: string
  coinPriceApiUrl: string
  exchangeRateApiKey: string
  // coinInfoApiUrl: string
  exchangeRateApiUrl: string
}

export interface RedisConfig {
  host: string | undefined
  port: number
}
