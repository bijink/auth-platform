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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { Role } from 'generated/prisma/enums'
import { Public, Roles, User } from 'src/auth/decorator'
import {
  ChangeUserRoleDto,
  DeleteUserDto,
  GetUsersQueryDto,
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
  @ApiOperation({ summary: 'Get all users' })
  @ApiOkResponse({ description: 'List of users retrieved successfully' })
  @Get()
  getAllUsers(@Query() getUsersQueryDto: GetUsersQueryDto) {
    return this.userService.findAllUsers(getUsersQueryDto)
  }

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ description: 'User profile retrieved successfully' })
  @Get('me')
  getMe(@User('sub') userId: number) {
    return this.userService.findUserByUserId(userId)
  }

  @ApiOperation({ summary: 'Get user by ID' })
  @ApiOkResponse({ description: 'User retrieved successfully' })
  @Get(':id')
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findUserByUserId(id)
  }

  @ApiOperation({ summary: 'Update user profile' })
  @ApiOkResponse({ description: 'User updated successfully' })
  @Patch()
  updateUser(
    @User('sub') userId: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateUser(userId, updateUserDto)
  }

  @ApiOperation({ summary: 'Soft delete user' })
  @ApiOkResponse({ description: 'User soft deleted successfully' })
  @Delete()
  deleteUser(
    @User('email') email: string,
    @Body() deleteUserDto: DeleteUserDto,
  ) {
    return this.userService.softDeleteUser(email, deleteUserDto)
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate user account' })
  @ApiOkResponse({ description: 'User reactivated successfully' })
  @Post('reactivate-user')
  reactivateUser(@Body() reactivateUserDto: ReactivateUserDto) {
    return this.userService.reactivateUser(reactivateUserDto)
  }

  // #remove this route (hard-delete), instead create user block and unblock routes (allow only super_admin/admin)
  @ApiOperation({ summary: 'Hard delete user' })
  @ApiOkResponse({ description: 'User permanently deleted successfully' })
  @Delete('hard-delete')
  hardDeleteUser(
    @User('email') email: string,
    @Body() deleteUserDto: DeleteUserDto,
  ) {
    return this.userService.hardDeleteUser(email, deleteUserDto)
  }

  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Change user role' })
  @ApiOkResponse({ description: 'User role changed successfully' })
  @Patch(':id/change-role')
  changeUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() changeUserRoleDto: ChangeUserRoleDto,
  ) {
    return this.userService.changeUserRole(id, changeUserRoleDto)
  }
}
