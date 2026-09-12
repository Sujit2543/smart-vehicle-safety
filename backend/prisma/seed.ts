import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Super Admin
  const existing = await prisma.user.findUnique({ where: { email: 'admin@cardeal.com' } });
  if (!existing) {
    const passwordHash = await bcrypt.hash('Admin@123456', 12);
    const admin = await prisma.user.create({
      data: {
        email: 'admin@cardeal.com',
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      },
    });
    console.log('✅ Super admin created:', admin.email);
  } else {
    console.log('ℹ️  Super admin already exists');
  }

  // Generate 20 demo tags: CD-1001 to CD-1020
  const tagData = Array.from({ length: 20 }, (_, i) => ({
    tagId: `CD-${String(1001 + i).padStart(4, '0')}`,
  }));

  for (const tag of tagData) {
    const existing = await prisma.tag.findUnique({ where: { tagId: tag.tagId } });
    if (!existing) {
      await prisma.tag.create({ data: tag });
    }
  }
  console.log('✅ 20 demo tags created (CD-1001 to CD-1020)');

  // Notification templates
  const templates = [
    { event: 'WELCOME' as const, channel: 'WHATSAPP' as const, name: 'Welcome Message', template: '🎉 Welcome {{Customer_Name}}! Your vehicle {{Car_Number}} is registered. Dashboard: {{Dashboard_Link}}', variables: ['Customer_Name', 'Car_Number', 'Dashboard_Link'] },
    { event: 'INSURANCE_EXPIRY' as const, channel: 'WHATSAPP' as const, name: 'Insurance Expiry Alert', template: '⚠️ Insurance for {{Car_Number}} expires on {{Expiry_Date}} ({{Days}} days). Renew now!', variables: ['Customer_Name', 'Car_Number', 'Expiry_Date', 'Days'] },
    { event: 'PUC_EXPIRY' as const, channel: 'WHATSAPP' as const, name: 'PUC Expiry Alert', template: '⚠️ PUC for {{Car_Number}} expires on {{Expiry_Date}} ({{Days}} days). Renew now!', variables: ['Customer_Name', 'Car_Number', 'Expiry_Date', 'Days'] },
    { event: 'SOS_ALERT' as const, channel: 'WHATSAPP' as const, name: 'SOS Emergency Alert', template: '🚨 EMERGENCY! Vehicle {{Car_Number}} SOS triggered. Location: {{Live_Location_Link}}', variables: ['Car_Number', 'Live_Location_Link'] },
  ];

  for (const t of templates) {
    await prisma.notificationTemplate.upsert({
      where: { event_channel: { event: t.event, channel: t.channel } as any },
      update: {},
      create: t,
    });
  }
  console.log('✅ Notification templates created');

  console.log('\n🎉 Seed complete!');
  console.log('Admin credentials: admin@cardeal.com / Admin@123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
