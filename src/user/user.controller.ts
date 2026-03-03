import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common'
import { Role } from 'generated/prisma/enums'
import { Roles, User } from 'src/auth/decorator'
import { ChangeUserRoleDto, UpdateUserDto } from './dto'
import { UserService } from './user.service'

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  @Get()
  getAllUsers() {
    return this.userService.findAllUsers()
  }

  @Get('me')
  getMe(@User('sub') userId: number) {
    return this.userService.findUserByUserId(userId)
  }

  @Get(':id')
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findUserByUserId(id)
  }

  @Patch(':id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateUser(id, updateUserDto)
  }

  @Delete()
  deleteUser(@User('sub') userId: number) {
    return this.userService.softDeleteUser(userId)
  }

  @Delete('hard-delete')
  hardDeleteUser(@User('sub') userId: number) {
    return this.userService.hardDeleteUser(userId)
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(':id/role')
  changeUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() changeUserRoleDto: ChangeUserRoleDto,
  ) {
    return this.userService.changeUserRole(id, changeUserRoleDto)
  }
}
