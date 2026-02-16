import { Injectable, NotFoundException } from '@nestjs/common'
import { User } from 'generated/prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findUser(id: number): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    })
    if (!user) throw new NotFoundException('User not found')
    return user
  }
}
