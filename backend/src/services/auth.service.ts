import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository.js';
import { config } from '../config/env.js';

export class AuthService {
  private userRepo = new UserRepository();

  async register(data: { email: string; password: string; name: string }) {
    const exists = await this.userRepo.findByEmail(data.email);
    if (exists) throw new Error('User already exists');

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.userRepo.create({ ...data, password: hashedPassword });
    const token = this.generateToken(user.id);

    return { token, user: { id: user.id, email: user.email, name: user.name } };
  }

  async login(data: { email: string; password: string }) {
    const user = await this.userRepo.findByEmail(data.email);
    if (!user) throw new Error('Invalid credentials');

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) throw new Error('Invalid credentials');

    const token = this.generateToken(user.id);
    return { token, user: { id: user.id, email: user.email, name: user.name } };
  }

  private generateToken(userId: string): string {
    return jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
  }
}
