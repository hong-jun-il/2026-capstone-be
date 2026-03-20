import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendEmailDto {
  @IsEmail({}, { message: '유효한 이메일 형식이 아닙니다.' })
  @IsNotEmpty({ message: '이메일을 입력해주세요.' })
  email: string;
}
