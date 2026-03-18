import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  async login(_email: string, _password: string): Promise<never> {
    throw new Error('Not implemented — will be completed in IAM epic');
  }
}
