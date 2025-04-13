const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const adminData = require('./adminData.json');

const prisma = new PrismaClient();

async function seed() {
    try {
        await prisma.$connect();
        await addAdmin();
    }
    catch (error) {
        console.error(`Error in seeding: ${error.message}`);
    }
    finally {
        await prisma.$disconnect();
    }
}

async function addAdmin() {
    for (const admin of adminData) {
        const passwordHash = await bcrypt.hash(admin.password, 10);
        const newAdmin = await prisma.user.create({
            data: {
                email: admin.email,
                password: passwordHash,
                name: admin.name,
                role: "admin",
                createdAt: new Date()
            }
        });

    console.log(`Usuario admin creado con id: ${newAdmin.id} y email: ${newAdmin.email}`);
    }
}

seed();
prisma.$disconnect();