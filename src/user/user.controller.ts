import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common'
import { Role } from 'generated/prisma/enums'
import { Roles } from 'src/auth/decorator'
import { RolesGuard } from 'src/auth/guard'
import { ChangeUserRoleDto, UpdateUserDto } from './dto'
import { UserService } from './user.service'

@UseGuards(RolesGuard)
@Roles(Role.USER)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  @Get()
  getAllUsers() {
    return this.userService.findAllUsers()
  }

  @Get(':id')
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOneUserByUserId(id)
  }

  @Patch(':id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateUser(id, updateUserDto)
  }

  @Delete(':id')
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.softDeleteUser(id)
  }

  @Delete('hard-delete/:id')
  hardDeleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.hardDeleteUser(id)
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
