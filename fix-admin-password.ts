import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function fixAdminPassword() {
  try {
    const email = 'admin@game.local';
    const newPassword = 'pass123';

    console.log(`Updating admin password for ${email} to: ${newPassword}`);

    const hashedPassword = await hash(newPassword, 10);

    const user = await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
      include: { admin: true }
    });

    console.log('Admin password updated successfully:', {
      id: user.id,
      email: user.email,
      username: user.username,
      hasAdmin: !!user.admin,
      adminRole: user.admin?.role
    });

    // Verify the new password works
    const { compare } = await import('bcryptjs');
    const passwordValid = await compare(newPassword, user.password);
    console.log('New password verification:', passwordValid);

  } catch (error) {
    console.error('Error updating admin password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminPassword();
