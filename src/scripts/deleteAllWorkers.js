const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllWorkers() {
  try {
    const result = await prisma.worker.deleteMany();
    console.log(`Deleted ${result.count} workers successfully`);
  } catch (error) {
    console.error('Error deleting workers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllWorkers(); 