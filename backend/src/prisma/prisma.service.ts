import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  /**
   * 不强制 onModuleInit 里 $connect：进程可在无库时先启动，首次查询再连
   * （本地未起 docker 时 /v1/health 为 503，但便于编译/CI 拉起到监听）
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
