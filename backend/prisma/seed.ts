import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.agentProfile.upsert({
    where: { name: 'default' },
    create: {
      name: 'default',
      defaultModel: 'volc-ephemeral-placeholder',
      isDefault: true,
      policyVersion: '1',
      promptVersion: '1',
    },
    update: {},
  });
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
