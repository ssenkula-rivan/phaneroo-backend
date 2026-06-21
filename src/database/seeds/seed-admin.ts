import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../data-source';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';

dotenv.config();

async function run(): Promise<void> {
  const email = process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME || process.env.SEED_ADMIN_FULL_NAME || 'Super Admin';
  const phoneNumber = process.env.ADMIN_PHONE || process.env.SEED_ADMIN_PHONE || '+256700000000';

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env file');
    process.exitCode = 1;
    return;
  }

  await AppDataSource.initialize();
  const usersRepo = AppDataSource.getRepository(User);

  try {
    const existing = await usersRepo.findOne({ where: { email } });
    if (existing) {
      console.log(`Admin user ${email} already exists - nothing to do.`);
      return;
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const admin = usersRepo.create({
      email,
      phoneNumber,
      fullName,
      passwordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
    });
    await usersRepo.save(admin);
    console.log(`Created super admin user: ${email}`);
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exitCode = 1;
});
