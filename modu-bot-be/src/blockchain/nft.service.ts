import {
  Injectable,
  OnModuleInit,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';
import * as HsNftAbi from './abis/hs-nft.abi.json';

@Injectable()
export class NftService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NftService.name);
  private provider: ethers.WebSocketProvider;
  private nftContract: ethers.Contract;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.connectToBlockchain();
  }

  private connectToBlockchain() {
    const wssUrl = this.configService.getOrThrow<string>('AMOI_WSS_URL');
    const contractAddress =
      this.configService.getOrThrow<string>('HS_NFT_ADDRESS');

    this.provider = new ethers.WebSocketProvider(wssUrl);
    this.nftContract = new ethers.Contract(
      contractAddress,
      HsNftAbi.abi,
      this.provider,
    );

    this.logger.log('Alchemy WSS 연결 성공 (Polygon Amoy)');
    this.setupEventListeners();

    // 에러 발생 시 재연결
    this.provider.on('error', (error) => {
      this.logger.error('WSS 연결 에러:', error);
      this.reconnect();
    });
  }

  private async setupEventListeners() {
    // 기존 리스너 제거 (중복 등록 방지)
    this.nftContract.removeAllListeners('NftPurchased');

    this.logger.log('NFT 구매 이벤트 감시 시작...');

    this.nftContract.on(
      'NftPurchased',
      async (buyer, index, tokenId, price, event) => {
        try {
          this.logger.log(
            `🔥 이벤트 발생! 구매자: ${buyer}, NFT 인덱스: ${index}`,
          );

          // 여기에 DB 업데이트 로직 추가
          // 예: await this.nftService.handleNftPurchase(buyer, Number(index));
        } catch (error) {
          this.logger.error('이벤트 처리 중 오류:', error.message);
        }
      },
    );
  }

  private reconnect() {
    this.logger.warn('5초 후 WSS 재연결을 시도합니다...');
    if (this.provider) {
      this.provider.destroy();
    }
    setTimeout(() => this.connectToBlockchain(), 5000);
  }

  async onModuleDestroy() {
    if (this.provider) {
      await this.provider.destroy();
    }
  }
}
