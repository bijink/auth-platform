import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Role } from 'generated/prisma/enums'
import { Public, Roles, User } from 'src/auth/decorator'
import { PaginationQueryDto } from 'src/common/pagination/dto'
import {
  ChangeUserRoleDto,
  DeleteUserDto,
  ReactivateUserDto,
  UpdateUserDto,
} from './dto'
import { UserService } from './user.service'

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN)
  @Get()
  getAllUsers(@Query() paginationQueryDto: PaginationQueryDto) {
    return this.userService.findAllUsers(paginationQueryDto)
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

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reactivate-user')
  reactivateUser(@Body() reactivateUserDto: ReactivateUserDto) {
    return this.userService.reactivateUser(reactivateUserDto)
  }

  // #remove this route (hard-delete), instead create user block and unblock routes (allow only super_admin/admin)
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
