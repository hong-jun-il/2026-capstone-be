import { Global, Module } from '@nestjs/common';
import { NftService } from './nft.service';
import { TokenService } from './token.service';

import { BlockchainController } from './blockchain.controller';

@Global()
@Module({
  providers: [NftService, TokenService],
  controllers: [BlockchainController],
  exports: [TokenService],
})
export class BlockchainModule {}
