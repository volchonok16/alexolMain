import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository.js';
import { config } from '../config/env.js';

export class AuthService {
  private userRepo = new UserRepository();

  async login(data: { login: string; password: string }) {
    const user = await this.userRepo.findByLogin(data.login);
    if (!user) throw new Error('Invalid credentials');

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) throw new Error('Invalid credentials');

    if (user.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const token = this.generateToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        login: user.login,
        name: user.name,
        role: user.role,
        photo: user.photo,
      },
    };
  }

  private generateToken(userId: string): string {
    return jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
  }
}
