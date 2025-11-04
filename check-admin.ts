import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@game.local' },
      include: { admin: true }
    });

    if (user) {
      console.log('Admin user found:', {
        id: user.id,
        email: user.email,
        username: user.username,
        passwordHash: user.password.substring(0, 20) + '...',
        hasAdmin: !!user.admin,
        adminRole: user.admin?.role
      });
    } else {
      console.log('Admin user not found');
    }
  } catch (error) {
    console.error('Error checking admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
