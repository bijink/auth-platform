import { Role } from 'generated/prisma/enums'

export interface ActiveUser {
  sub: number
  email: string
  role: Role
}
