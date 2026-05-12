# Authentication System

## Description

Production-ready authentication and authorization API for SaaS applications built with NestJS, Prisma, and PostgreSQL, featuring RBAC, JWT auth, audit logs, and secure user management.

## Project requirment

- Node ^22
- Pnpm ^10
- Docker

## Project setup

Create `.env` file in root directory and add these variables.

```bash
# need POSTGRES_DB in .env file for variable interpolation in docker-compose.yml files
POSTGRES_DB=DB_NAME

# need DATABASE_URL in .env file for prisma studio
# for dev environment:
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5431/DB_NAME
# for prod environment:
# DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DB_NAME
```

Then create `.env.development` (for dev environment) and `.env.production` (for prod environment) files in root directory. Add variables according to the example variables given in `.env.example` file.

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start:docker

# watch mode
$ pnpm run start:docker:dev

# production mode
$ pnpm run start:docker:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Development

### Add new packages

To add new node packages, you need to mount the local `node_modules` with the docker container `node_modules`.

First install package locally. Then run (may be twice)

```bash
# restart docker api dev container
$ pnpm run api:dev:restart
```

## Stay in touch

- Author - [Bijin Krishn](https://twitter.com/bijinkrishn)

## License

Authentication System is [MIT licensed](https://github.com/bijink/authentication-system/main/LICENSE).
