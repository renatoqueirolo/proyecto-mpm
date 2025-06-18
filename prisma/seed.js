const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const adminData = require('./adminData.json');

const prisma = new PrismaClient();

async function seed() {
    try {
        await prisma.$connect();
        await addProjects();
        await addAdmin();
        await addShiftTypes();
    }
    catch (error) {
        console.error(`Error in seeding: ${error.message}`);
    }
    finally {
        await prisma.$disconnect();
    }
}

async function addAdmin() {
    const allProjects = await prisma.project.findMany();
    for (const admin of adminData) {
        const passwordHash = await bcrypt.hash(admin.password, 10);
        const newAdmin = await prisma.user.create({
            data: {
                email: admin.email,
                password: passwordHash,
                name: admin.name,
                role: "ADMIN",
                proyectos: {
                    connect: allProjects.map(project => ({ id: project.id }))
                },
                createdAt: new Date()
            }
        });

    console.log(`Usuario admin creado con id: ${newAdmin.id} y email: ${newAdmin.email}`);
    }
}

async function addProjects() {
    const projects = [
        { name: 'Escondida' },
        { name: 'Spence' },
        { name: 'El Teniente' }
    ];

    for (const project of projects) {
        await prisma.project.upsert({
            where: { name: project.name },
            update: {},
            create: {
                name: project.name,
                createdAt: new Date()
            }
        });
    }

    console.log('Proyectos creados exitosamente');
}

async function addShiftTypes() {
    const shiftTypeData = [
        { name: "14x14" },
        { name: "7x7" }
    ];
    for (const shiftType of shiftTypeData) {
        await prisma.shiftType.upsert({
            where: { name: shiftType.name },
            update: {},
            create: {
                name: shiftType.name,
                createdAt: new Date()
            }
        });
    }
}

seed();
prisma.$disconnect();