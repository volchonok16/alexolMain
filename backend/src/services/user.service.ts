import { UserRepository } from '../repositories/user.repository.js';

export class UserService {
  private userRepo = new UserRepository();

  async findById(id: string) {
    const user = await this.userRepo.findById(id);
    if (!user) throw new Error('User not found');
    
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findAll() {
    const users = await this.userRepo.findAll();
    return users.map(({ password, ...user }) => user);
  }
}
