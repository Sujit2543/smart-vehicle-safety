import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'sujit2001026@gmail.com';
  const password = 'Cardeal@123';

  const existing = await prisma.user.findUnique({ where: { email } });
  const hash = await bcrypt.hash(password, 12);

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hash, role: 'SUPER_ADMIN', isActive: true },
    });
    console.log('✅ Updated existing account to SUPER_ADMIN');
  } else {
    await prisma.user.create({
      data: { email, passwordHash: hash, role: 'SUPER_ADMIN', isActive: true },
    });
    console.log('✅ Created new SUPER_ADMIN account');
  }

  console.log('\n─────────────────────────────────');
  console.log('Email:    ' + email);
  console.log('Password: ' + password);
  console.log('Role:     SUPER_ADMIN');
  console.log('URL:      http://localhost:3000/admin/login');
  console.log('─────────────────────────────────\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
