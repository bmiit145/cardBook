const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@businesscards.com';
  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@12345';

  console.log(`[Seed] Initializing Admin account: ${adminEmail}`);

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      name: 'System Administrator',
    },
    create: {
      email: adminEmail,
      passwordHash,
      name: 'System Administrator',
    },
  });

  console.log(`[Seed] Admin user created/updated successfully with ID: ${admin.id}`);
  console.log(`[Seed] Credentials -> Email: ${adminEmail} | Password: ${defaultPassword}`);
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

