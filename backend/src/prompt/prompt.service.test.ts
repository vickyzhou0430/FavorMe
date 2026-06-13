import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import { PromptService } from './prompt.service';

function createService(options: { enabled: boolean; stored?: string }) {
  const store = new Map<string, { key: string; content: string; updatedAt: Date; updatedBy: string | null }>();
  if (options.stored != null) {
    store.set('k', { key: 'k', content: options.stored, updatedAt: new Date(), updatedBy: null });
  }

  const prisma = {
    promptOverride: {
      async findUnique({ where }: { where: { key: string } }) {
        return store.get(where.key) ?? null;
      },
      async upsert({
        where,
        update,
        create,
      }: {
        where: { key: string };
        update: { content?: string; updatedBy?: string | null };
        create: { key: string; content: string; updatedBy?: string | null };
      }) {
        const existing = store.get(where.key);
        const next = existing
          ? { ...existing, ...update, updatedAt: new Date() }
          : {
              key: create.key,
              content: create.content,
              updatedBy: create.updatedBy ?? null,
              updatedAt: new Date(),
            };
        store.set(where.key, next);
        return next;
      },
      async deleteMany({ where }: { where: { key: string } }) {
        store.delete(where.key);
        return { count: 1 };
      },
    },
  } as unknown as PrismaService;

  const config = {
    get: () => (options.enabled ? 'true' : 'false'),
  } as unknown as ConfigService;

  return new PromptService(prisma, config);
}

describe('PromptService', () => {
  test('returns fallback when override disabled, even if stored', async () => {
    const service = createService({ enabled: false, stored: '覆盖内容' });
    assert.equal(service.isOverrideEnabled(), false);
    assert.equal(await service.getEffectivePrompt('k', 'DEFAULT'), 'DEFAULT');
  });

  test('returns stored override when enabled', async () => {
    const service = createService({ enabled: true, stored: '覆盖内容' });
    assert.equal(await service.getEffectivePrompt('k', 'DEFAULT'), '覆盖内容');
  });

  test('returns fallback when enabled but no override', async () => {
    const service = createService({ enabled: true });
    assert.equal(await service.getEffectivePrompt('k', 'DEFAULT'), 'DEFAULT');
  });

  test('blank override falls back to default', async () => {
    const service = createService({ enabled: true, stored: '   ' });
    assert.equal(await service.getEffectivePrompt('k', 'DEFAULT'), 'DEFAULT');
  });

  test('set then get then clear', async () => {
    const service = createService({ enabled: true });
    await service.setOverride('k', '新提示词', 'dev-1');
    const got = await service.getOverride('k');
    assert.equal(got?.content, '新提示词');
    assert.equal(got?.updatedBy, 'dev-1');
    await service.clearOverride('k');
    assert.equal(await service.getOverride('k'), null);
  });
});
