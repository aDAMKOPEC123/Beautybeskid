"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// filepath: apps/server/prisma/seed.ts
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    // Create admin user
    const adminPasswordHash = await bcryptjs_1.default.hash('Admin2024!', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@gabinet.pl' },
        update: {},
        create: {
            email: 'admin@gabinet.pl',
            name: 'Administrator',
            passwordHash: adminPasswordHash,
            role: 'ADMIN',
            loyaltyTier: 'GOLD',
            loyaltyPoints: 9999
        }
    });
    console.log(`Created admin user: ${admin.email}`);
    // Create some initial services
    const servicesData = [
        {
            name: 'Konsultacja Kosmetologiczna',
            slug: 'konsultacja-kosmetologiczna',
            description: 'Szczegółowa diagnoza skóry wraz ze spersonalizowanym planem pielęgnacyjnym.',
            price: 150.00,
            durationMinutes: 45,
            category: 'Konsultacje'
        },
        {
            name: 'Oczyszczanie Wodorowe',
            slug: 'oczyszczanie-wodorowe',
            description: 'Zabieg wieloetapowego oczyszczania skóry z wykorzystaniem aktywnego wodoru.',
            price: 250.00,
            durationMinutes: 60,
            category: 'Zabiegi na twarz'
        }
    ];
    for (const s of servicesData) {
        await prisma.service.upsert({
            where: { slug: s.slug },
            update: {},
            create: s
        });
    }
    console.log('Created initial services.');
    // Create loyalty rewards
    const rewardsData = [
        {
            name: 'Zniżka 50 PLN',
            description: 'Kupon rabatowy 50 PLN na dowolny zabieg.',
            pointsCost: 500,
            discountType: 'AMOUNT',
            discountValue: 50
        },
        {
            name: 'Darmowa Konsultacja',
            description: 'Bezpłatna konsultacja kontrolna.',
            pointsCost: 700,
            discountType: 'OTHER'
        }
    ];
    for (const r of rewardsData) {
        const existing = await prisma.loyaltyReward.findFirst({ where: { name: r.name } });
        if (!existing) {
            await prisma.loyaltyReward.create({ data: r });
        }
    }
    console.log('Created initial loyalty rewards.');
    console.log('Seeding completed.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
