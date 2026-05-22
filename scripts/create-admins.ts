import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const admins = [
        { email: 'admin@admin.com', password: 'admin123', role: 'ADMIN', firstName: 'Admin', lastName: 'Admin' },
        { email: 'refund@admin.com', password: 'radmin123', role: 'REFUNDADMIN', firstName: 'Refund', lastName: 'Admin' },
    ];

    for (const admin of admins) {
        const hashedPassword = await bcrypt.hash(admin.password, 10);
        await prisma.user.upsert({
            where: { email: admin.email },
            update: { password: hashedPassword, role: admin.role },
            create: {
                email: admin.email,
                password: hashedPassword,
                role: admin.role,
                firstName: admin.firstName,
                lastName: admin.lastName,
            },
        });
        console.log(`Created/updated: ${admin.email} (${admin.role})`);
    }
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
