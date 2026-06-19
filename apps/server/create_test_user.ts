import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Test2024!', 10);
  const user = await prisma.user.upsert({
    where: { email: 'test@gabinet.pl' },
    update: {},
    create: {
      email: 'test@gabinet.pl',
      name: 'Test User',
      passwordHash: hash,
      role: 'USER',
    }
  });
  console.log('Test user created:', user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
