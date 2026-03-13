import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from './entities/users.entity';
import { Repository } from 'typeorm';
import { CreateUsersDto } from './dto/create-users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
  ) {}

  async createUser(model: CreateUsersDto): Promise<Users> {
    const existingUser = await this.userRepository.exists({
      where: {
        walletAddress: model.walletAddress,
      },
    });

    if (existingUser) {
      throw new BadRequestException('이미 가입된 주소 입니다');
    }

    const userObject = this.userRepository.create(model);

    const newUser = this.userRepository.save(userObject);

    return newUser;
  }

  async getAllUsers(): Promise<Users[]> {
    return this.userRepository.find();
  }

  async getUserByEmail(email: string): Promise<Users> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(
        `해당 ${email}을 가진 유저가 존재하지 않습니다`,
      );
    }

    return user;
  }
}
