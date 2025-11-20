import axios from 'axios';

const BASE_URL = 'http://localhost:8020/api/v1';

async function test() {
    try {
        // Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'superadmin@testcompany.com',
            password: 'NewSuperAdmin@456'
        });

        const token = loginRes.data.data.tokens.accessToken;
        console.log('Login successful');

        // Get all users
        console.log('\nGetting all users...');
        const usersRes = await axios.get(`${BASE_URL}/users`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Users Response:', JSON.stringify(usersRes.data, null, 2));

        // Create a new user
        console.log('\nCreating a new user...');
        const createRes = await axios.post(`${BASE_URL}/users`, {
            email: `testuser${Date.now()}@testcompany.com`,
            password: 'TestUser@123',
            confirmPassword: 'TestUser@123',
            name: 'Test User',
            phone: '9876543999',
            role: 'VIEWER',
            companyId: '77fa8cfc-4e6d-43db-8af1-042baa4fb822'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Create User Response:', JSON.stringify(createRes.data, null, 2));

        const userId = createRes.data.data.id;
        console.log('Created user ID:', userId);

        // Get user by ID
        console.log('\nGetting user by ID...');
        const userRes = await axios.get(`${BASE_URL}/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Get User Response:', JSON.stringify(userRes.data, null, 2));

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

test();