import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MailService } from './mail.service';
import { SendEmailDto } from './dto/send-email.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { GetCurrentUserId } from 'src/common/decorators/get-current-user-id.decorator';
import { AccessTokenGuard } from 'src/common/guards/access-token.guard';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @UseGuards(AccessTokenGuard)
  @Post('send')
  async sendEmail(
    @Body() body: SendEmailDto,
    @GetCurrentUserId() userId: string,
  ) {
    return this.mailService.sendVerificationCode(userId, body.email);
  }

  @UseGuards(AccessTokenGuard)
  @Post('verify')
  async verifyCode(
    @Body() body: VerifyEmailDto,
    @GetCurrentUserId() userId: string,
  ) {
    return this.mailService.verifyEmailCode(userId, body.email, body.code);
  }
}
