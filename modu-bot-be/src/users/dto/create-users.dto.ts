import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsEthereumAddress,
  Length,
  Matches,
} from 'class-validator';

export class CreateUsersDto {
  @IsString()
  @IsNotEmpty({ message: '이름은 필수 입력값입니다.' })
  @Length(2, 20, { message: '이름은 2자 이상, 20자 이하로 입력해주세요.' })
  @Matches(/^[a-zA-Z가-힣]+$/, {
    message: '이름은 한글 또는 영문만 입력 가능합니다.',
  })
  name: string;

  @IsString()
  @IsNotEmpty({ message: '지갑 주소는 필수 입력값입니다.' })
  @IsEthereumAddress({ message: '유효한 지갑 주소 형식이 아닙니다.' })
  walletAddress: string;

  @IsString()
  @IsNotEmpty({ message: '이메일은 필수 입력값입니다.' })
  @IsEmail({}, { message: '유효한 이메일 형식이 아닙니다.' })
  email: string;
}
