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
import { Roles } from 'src/auth/decorator/roles.decorator'
import { ChangeUserRoleDto } from './dto/change-user-role.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UsersService } from './users.service'

@Roles(Role.USER)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  @Get()
  getAllUsers() {
    return this.usersService.findAllUsers()
  }

  @Get(':id')
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findUser(id)
  }

  @Patch(':id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, updateUserDto)
  }

  @Delete(':id')
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.softDeleteUser(id)
  }

  @Delete('hard-delete/:id')
  hardDeleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.hardDeleteUser(id)
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(':id/role')
  changeUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() changeUserRoleDto: ChangeUserRoleDto,
  ) {
    return this.usersService.changeUserRole(id, changeUserRoleDto)
  }
}
