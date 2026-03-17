import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';
import * as HsTokenAbi from './abis/hs-token.abi.json';

@Injectable()
export class TokenService implements OnModuleInit {
  private readonly logger = new Logger(TokenService.name);
  private provider: ethers.WebSocketProvider;
  private wallet: ethers.Wallet;
  private tokenContract: ethers.Contract;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.setupContract();
  }

  private setupContract() {
    const wssUrl = this.configService.getOrThrow<string>('AMOI_WSS_URL');
    const privateKey = this.configService.getOrThrow<string>('PRIVATE_KEY');
    const contractAddress =
      this.configService.getOrThrow<string>('HS_TOKEN_ADDRESS');

    this.provider = new ethers.WebSocketProvider(wssUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);

    this.tokenContract = new ethers.Contract(
      contractAddress,
      HsTokenAbi.abi,
      this.wallet, // Signer를 연결하여 트랜잭션 전송 가능하게 함
    );

    this.logger.log('HS Token 서비스가 준비되었습니다.');
  }

  /**
   * 유저의 HS 토큰 잔액 조회
   */
  async getBalance(address: string): Promise<string> {
    try {
      const balance = await this.tokenContract.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (error) {
      this.logger.error(`잔액 조회 실패 (${address}):`, error.message);
      throw error;
    }
  }

  /**
   * 챗봇 기여에 대한 보상 지급 (Admin 권한 필요)
   * @param to 보상 받을 유저 지갑 주소
   * @param amount 지급할 토큰 양 (예: "10.5")
   */
  async rewardUser(to: string, amount: string): Promise<string> {
    try {
      this.logger.log(`보상 지급 시도: ${to}, 수량: ${amount}`);

      const amountWei = ethers.parseEther(amount);
      const tx = await this.tokenContract.rewardUser(to, amountWei);

      this.logger.log(`트랜잭션 전송됨: ${tx.hash}`);

      // 트랜잭션 확정 대기
      const receipt = await tx.wait();
      this.logger.log(`보상 지급 완료! 블록: ${receipt.blockNumber}`);

      return tx.hash;
    } catch (error) {
      this.logger.error(`보상 지급 실패 (${to}):`, error.message);
      throw error;
    }
  }

  /**
   * 일반 토큰 전송 (admin 지갑 -> 유저)
   */
  async transfer(to: string, amount: string): Promise<string> {
    try {
      const amountWei = ethers.parseEther(amount);
      const tx = await this.tokenContract.transfer(to, amountWei);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      this.logger.error(`토큰 전송 실패 (${to}):`, error.message);
      throw error;
    }
  }
}
