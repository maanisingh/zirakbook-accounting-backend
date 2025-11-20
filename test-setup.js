import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupTestData() {
  try {
    // Check if company exists
    let company = await prisma.company.findFirst();

    if (!company) {
      // Create test company
      company = await prisma.company.create({
        data: {
          name: 'Test Company Pvt Ltd',
          email: 'info@testcompany.com',
          phone: '+91-9876543210',
          address: '123 Business Park',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          postalCode: '400001',
          taxNumber: 'GSTIN123456789',
          registrationNo: 'CIN123456',
          baseCurrency: 'INR',
          fiscalYearStart: new Date('2024-04-01'),
          fiscalYearEnd: new Date('2025-03-31'),
          isActive: true
        }
      });
      console.log('Company created:', company);
    } else {
      console.log('Existing company found:', company);
    }

    // Check if superadmin exists
    const superadmin = await prisma.user.findFirst({
      where: { role: 'SUPERADMIN' }
    });

    if (!superadmin) {
      console.log('No superadmin found. One will be created via API registration.');
    } else {
      console.log('Superadmin exists:', superadmin.email);
    }

    return company;
  } catch (error) {
    console.error('Error setting up test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestData().then(company => {
  console.log('Test data setup complete');
  console.log('Company ID:', company.id);
  process.exit(0);
});