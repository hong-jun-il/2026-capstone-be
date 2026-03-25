import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class MailService {
  // 추후 redis 로 바꿀 예정
  private verificationStore = new Map<
    string,
    { code: string; expiresAt: Date }
  >();

  constructor(
    private readonly mailerService: MailerService,
    private readonly usersService: UsersService,
  ) {}

  async sendVerificationCode(userId: string, targetEmail: string) {
    const user = await this.usersService.getUserById(userId);
    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }

    const normalizedTarget = targetEmail.trim().toLowerCase();
    const normalizedStored = user.email.trim().toLowerCase();

    if (normalizedStored !== normalizedTarget) {
      throw new BadRequestException(
        '가입 시 입력한 이메일 주소와 일치하지 않습니다.',
      );
    }

    if (user.isVerified) {
      throw new BadRequestException('이미 인증이 완료된 유저입니다.');
    }

    if (!targetEmail.endsWith('hansung.ac.kr')) {
      throw new BadRequestException(
        '한성대학교 이메일 형식(hansung.ac.kr)만 지원합니다.',
      );
    }

    // 랜덤 번호 생성
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 만료 시간 설정 (+5분)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // 발송된 코드 임시 저장소에 보관
    this.verificationStore.set(targetEmail, { code, expiresAt });

    // 이메일 발송
    await this.mailerService.sendMail({
      to: targetEmail,
      subject: '[ModuBot] 대학교 이메일 인증 코드 안내',
      template: './verification',
      context: {
        code,
      },
    });

    return { message: '인증 코드가 이메일로 성공적으로 발송되었습니다.' };
  }

  async verifyEmailCode(userId: string, email: string, inputCode: string) {
    // 해당 이메일로 발송된 코드 기록 찾기
    const record = this.verificationStore.get(email);

    if (!record) {
      throw new BadRequestException(
        '인증 요청 내역이 없습니다. 먼저 코드를 발송해주세요.',
      );
    }

    if (new Date() > record.expiresAt) {
      this.verificationStore.delete(email);
      throw new BadRequestException(
        '인증 코드의 유효 시간이 만료되었습니다. 다시 요청해주세요.',
      );
    }

    if (record.code !== inputCode) {
      throw new BadRequestException('인증 코드가 일치하지 않습니다.');
    }

    // 모든 검증 통과 -> 유저 정보 업데이트
    const user = await this.usersService.getUserById(userId);
    user.isVerified = true;
    user.email = email;
    await this.usersService.saveUser(user);

    // 사용이 끝난 인증 코드는 파쇄
    this.verificationStore.delete(email);

    return { message: '대학교 이메일 인증이 완료되었습니다!' };
  }
}
