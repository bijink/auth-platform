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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Roles, User } from 'src/auth/decorator'
import { ChangeUserRoleDto, DeleteUserDto, UpdateUserDto } from './dto'
import { UserService } from './user.service'

@ApiTags('Users')
@ApiBearerAuth()
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

  @Patch()
  updateUser(
    @User('sub') userId: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateUser(userId, updateUserDto)
  }

  @Delete()
  deleteUser(
    @User('email') email: string,
    @Body() deleteUserDto: DeleteUserDto,
  ) {
    return this.userService.softDeleteUser(email, deleteUserDto)
  }

  @Delete('hard-delete')
  hardDeleteUser(
    @User('email') email: string,
    @Body() deleteUserDto: DeleteUserDto,
  ) {
    return this.userService.hardDeleteUser(email, deleteUserDto)
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(':id/change-role')
  changeUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() changeUserRoleDto: ChangeUserRoleDto,
  ) {
    return this.userService.changeUserRole(id, changeUserRoleDto)
  }
}
