import { UserRepository } from '../repositories/user.repository.js';

export class UserService {
  private userRepo = new UserRepository();

  async findById(id: string) {
    const user = await this.userRepo.findById(id);
    if (!user) throw new Error('User not found');
    
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findAll(page: number = 1, limit: number = 20) {
    const { users, pagination } = await this.userRepo.findAll(page, limit);
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    
    return {
      users: usersWithoutPasswords,
      pagination
    };
  }
}
