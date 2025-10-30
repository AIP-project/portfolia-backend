# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NestJS GraphQL backend for a portfolio management application. It manages various financial instruments including:
- Bank accounts and transactions
- Cryptocurrency portfolios and transactions
- Stock portfolios and transactions
- Liabilities and miscellaneous assets
- Price history tracking for stocks and cryptocurrencies
- Currency exchange rates

## Architecture

- **Framework**: NestJS with GraphQL (Apollo Server)
- **Database**: MySQL with Prisma ORM
- **Cache**: Redis for distributed locking and data caching
- **Authentication**: JWT-based with role-based access control
- **Task Scheduling**: Background tasks for price updates
- **Deployment**: Docker with PM2 clustering on Google Cloud Platform

## Key Development Commands

```bash
# Local development
yarn docker:compose          # Start local Docker environment
yarn start:dev               # Start development server
yarn build                   # Build the application
yarn format                  # Format code with Prettier
yarn format:check            # Check code formatting
yarn lint                    # Lint and fix code

# Testing
yarn test                    # Run unit tests
yarn test:e2e               # Run end-to-end tests
yarn test:cov               # Run tests with coverage

# Database (Prisma)
yarn prisma:generate        # Generate Prisma client
yarn prisma:push            # Push schema to database
yarn prisma:studio          # Open Prisma Studio

# Deployment
yarn docker:build           # Build Docker image
yarn docker:deploy          # Deploy image to registry
yarn service:deploy         # Deploy service to cloud
```

## Configuration

- Environment configuration is in `src/common/config/config.ts`
- API keys are stored in `/deploy/keys/` directory:
  - `coin-market-cap.key` - CoinMarketCap API key
  - `open-exchange-rate.key` - Exchange rate API key
- GraphQL playground available at `http://localhost:3000/graphql`

## Module Structure

Each domain follows a consistent pattern:
- `{domain}.module.ts` - Module definition
- `{domain}.resolver.ts` - GraphQL resolvers
- `{domain}.service.ts` - Business logic
- `dto/` - Data transfer objects and GraphQL inputs/models

Key modules:
- `account/` - Account management
- `bank-*/`, `coin-*/`, `stock-*/`, `etc-*/`, `liabilities-*` - Financial instrument modules
- `*-price-history/` - Price tracking with scheduled tasks
- `exchange/` - Currency exchange rate management
- `common/` - Shared utilities, guards, middleware, and configuration

## Database & Caching

- Prisma ORM with MySQL database
- Database schema defined in `prisma/schema.prisma`
- Redis for distributed locking (`DistributeLockModule`)
- DataLoader pattern implemented for efficient GraphQL queries
- Price history updated via scheduled tasks

## Authentication & Authorization

- JWT-based authentication with public/private key pairs
- Role-based access control via decorators (`@Roles()`)
- Auth guard and roles guard applied globally
- User entity supports multiple user states and roles

# Summary instructions

When you are using compact, please focus on test output and code changes