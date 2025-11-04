import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';

const prisma = new PrismaClient();

async function testLogin() {
  try {
    const email = 'admin@game.local';
    const password = 'pass123';

    console.log(`Testing login for ${email} with password: ${password}`);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { admin: true }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User found:', {
      id: user.id,
      email: user.email,
      username: user.username,
      hasAdmin: !!user.admin,
      adminRole: user.admin?.role
    });

    const passwordValid = await compare(password, user.password);
    console.log('Password valid:', passwordValid);

    if (passwordValid) {
      console.log('Login should succeed!');
    } else {
      console.log('Password is incorrect. Checking if it might be a different password...');

      // Try other possible passwords
      const testPasswords = ['admin123', 'admin', 'password', '123456'];
      for (const testPass of testPasswords) {
        const isValid = await compare(testPass, user.password);
        if (isValid) {
          console.log(`Password matches: ${testPass}`);
          break;
        }
      }
    }

  } catch (error) {
    console.error('Error testing login:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
