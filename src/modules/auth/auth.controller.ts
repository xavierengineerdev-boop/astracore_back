import { Controller, Post, Body, UnauthorizedException, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ schema: { example: { email: 'you@example.com', password: 'StrongPass123' } } })
  @ApiResponse({ status: 201, description: 'Returns access and refresh tokens' })
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.authService.login(user);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({ schema: { example: { refreshToken: '<JWT_REFRESH_TOKEN>' } } })
  @ApiResponse({ status: 200, description: 'Returns new access token' })
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user from access token' })
  @ApiResponse({ status: 200, description: 'Current user (from token + profile)' })
  async me(@Req() req: any) {
    const profile = await this.userService.findById(String(req.user.userId));
    return {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role,
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      lastLoginAt: profile?.lastLoginAt ?? undefined,
      departmentId: profile?.departmentId ? String(profile.departmentId) : undefined,
    };
  }
}
