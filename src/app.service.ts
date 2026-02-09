import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_NAME } from './constants';

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  getInfo() {
    return {
      name: APP_NAME,
      version: '0.0.1',
      env: this.config.get('nodeEnv'),
      docs: '/docs',
    };
  }
}
