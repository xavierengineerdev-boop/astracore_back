import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    if (user.isActive === false) return null;

    const ok = await bcrypt.compare(pass, user.password);
    if (!ok) return null;

    const obj = user.toObject ? user.toObject() : user;
    delete obj.password;
    return obj;
  }

  async login(user: any) {
    await this.usersService.updateLastLogin(String(user._id));
    const payload = { sub: user._id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshExpiresIn = this.config.get<string>('jwtRefreshExpiresIn') || '7d';
    const refreshToken = this.jwtService.sign(payload, { expiresIn: refreshExpiresIn as any });
    return { access_token: accessToken, refresh_token: refreshToken };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const newPayload = { sub: payload.sub, email: payload.email, role: payload.role };
      const accessToken = this.jwtService.sign(newPayload);
      return { access_token: accessToken };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
