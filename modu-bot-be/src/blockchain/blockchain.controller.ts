import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { TokenService } from './token.service';
import { AccessTokenGuard } from 'src/common/guards/access-token.guard';

@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly tokenService: TokenService) {}

  // 유저 토큰 조회
  // @UseGuards(AccessTokenGuard)
  @Get('balance/:address')
  async getBalance(@Param('address') address: string) {
    const balance = await this.tokenService.getBalance(address);
    return {
      address,
      balance,
      symbol: 'HS',
    };
  }

  // 보상 지급
  @Post('reward')
  async rewardUser(@Body() body: { to: string; amount: string }) {
    const txHash = await this.tokenService.rewardUser(body.to, body.amount);
    return {
      message: '보상이 성공적으로 지급되었습니다.',
      txHash,
    };
  }

  // 토큰 전송
  @Post('transfer')
  async transfer(@Body() body: { to: string; amount: string }) {
    const txHash = await this.tokenService.transfer(body.to, body.amount);
    return {
      message: '토큰 전송이 완료되었습니다.',
      txHash,
    };
  }
}
