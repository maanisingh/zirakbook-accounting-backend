import axios from 'axios';

const BASE_URL = 'http://localhost:8020/api/v1';
const COMPANY_ID = '77fa8cfc-4e6d-43db-8af1-042baa4fb822';

let authToken = '';
let testUserId = '';
let accountantUserId = '';
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;
let testResults = [];

// Colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const NC = '\x1b[0m'; // No Color

// Test helper function
function testResult(testName, passed, details = '') {
    testsRun++;
    if (passed) {
        testsPassed++;
        console.log(`${GREEN}✓${NC} ${testName}`);
        testResults.push({ name: testName, status: 'PASS' });
    } else {
        testsFailed++;
        console.log(`${RED}✗${NC} ${testName}`);
        if (details) console.log(`  ${RED}${details}${NC}`);
        testResults.push({ name: testName, status: 'FAIL', error: details });
    }
}

async function runTests() {
    console.log(`${BLUE}========================================${NC}`);
    console.log(`${BLUE}Comprehensive Authentication & User Testing${NC}`);
    console.log(`${BLUE}========================================${NC}\n`);

    try {
        // ============ AUTHENTICATION TESTS ============
        console.log(`${YELLOW}AUTHENTICATION ENDPOINTS${NC}\n`);

        // 1. Login as superadmin
        console.log('1. Testing Login...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'superadmin@testcompany.com',
            password: 'NewSuperAdmin@456'
        });

        if (loginRes.data.success) {
            authToken = loginRes.data.data.tokens.accessToken;
            testResult('Login', true);
        } else {
            testResult('Login', false, 'Login failed');
            return;
        }

        // 2. Get current user
        console.log('2. Testing Get Current User...');
        const meRes = await axios.get(`${BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        testResult('Get Current User', meRes.data.success);

        // 3. Verify token
        console.log('3. Testing Verify Token...');
        const verifyRes = await axios.get(`${BASE_URL}/auth/verify`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        testResult('Verify Token', verifyRes.data.success);

        // 4. Refresh token
        console.log('4. Testing Refresh Token...');
        const refreshToken = loginRes.data.data.tokens.refreshToken;
        const refreshRes = await axios.post(`${BASE_URL}/auth/refresh-token`, {
            refreshToken: refreshToken
        });

        if (refreshRes.data.success) {
            authToken = refreshRes.data.data.tokens.accessToken;
            testResult('Refresh Token', true);
        } else {
            testResult('Refresh Token', false);
        }

        // ============ USER MANAGEMENT TESTS ============
        console.log(`\n${YELLOW}USER MANAGEMENT ENDPOINTS${NC}\n`);

        // 5. Get all users
        console.log('5. Testing Get All Users...');
        const usersRes = await axios.get(`${BASE_URL}/users`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        testResult('Get All Users', usersRes.data.success);
        console.log(`   Found ${usersRes.data.data.users.length} users`);

        // 6. Get user stats
        console.log('6. Testing Get User Stats...');
        const statsRes = await axios.get(`${BASE_URL}/users/stats`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        testResult('Get User Stats', statsRes.data.success);

        // 7. Create new user
        console.log('7. Testing Create New User...');
        const createUserRes = await axios.post(`${BASE_URL}/users`, {
            email: 'testuser@testcompany.com',
            password: 'TestUser@123',
            confirmPassword: 'TestUser@123',
            name: 'Test User',
            phone: '9876543555',
            role: 'SALES_USER',
            companyId: COMPANY_ID
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        if (createUserRes.data.success) {
            testUserId = createUserRes.data.data.id;
            testResult('Create New User', true);
            console.log(`   Created user ID: ${testUserId}`);
        } else {
            testResult('Create New User', false);
        }

        // 8. Get user by ID
        if (testUserId) {
            console.log('8. Testing Get User by ID...');
            const getUserRes = await axios.get(`${BASE_URL}/users/${testUserId}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            testResult('Get User by ID', getUserRes.data.success);
        }

        // 9. Update user
        if (testUserId) {
            console.log('9. Testing Update User...');
            const updateRes = await axios.patch(`${BASE_URL}/users/${testUserId}`, {
                name: 'Updated Test User',
                phone: '9876543666'
            }, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            testResult('Update User', updateRes.data.success);
        }

        // 10. Deactivate user
        if (testUserId) {
            console.log('10. Testing Deactivate User...');
            const deactivateRes = await axios.post(`${BASE_URL}/users/${testUserId}/deactivate`, {}, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            testResult('Deactivate User', deactivateRes.data.success);
        }

        // 11. Activate user
        if (testUserId) {
            console.log('11. Testing Activate User...');
            const activateRes = await axios.post(`${BASE_URL}/users/${testUserId}/activate`, {}, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            testResult('Activate User', activateRes.data.success);
        }

        // 12. Change user status
        if (testUserId) {
            console.log('12. Testing Change User Status...');
            const statusRes = await axios.post(`${BASE_URL}/users/${testUserId}/status`, {
                status: 'SUSPENDED',
                reason: 'Testing status change'
            }, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            testResult('Change User Status', statusRes.data.success);
        }

        // 13. Get user permissions
        if (testUserId) {
            console.log('13. Testing Get User Permissions...');
            const permsRes = await axios.get(`${BASE_URL}/users/${testUserId}/permissions`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            testResult('Get User Permissions', permsRes.data.success);
        }

        // 14. Assign permissions
        if (testUserId) {
            console.log('14. Testing Assign Permissions...');
            const assignRes = await axios.post(`${BASE_URL}/users/${testUserId}/permissions`, {
                permissions: [
                    { module: 'inventory', action: 'read', resource: 'products' },
                    { module: 'sales', action: 'create', resource: 'invoices' }
                ]
            }, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            testResult('Assign Permissions', assignRes.data.success);
        }

        // 15. Revoke permissions
        if (testUserId) {
            console.log('15. Testing Revoke Permissions...');
            const revokeRes = await axios.delete(`${BASE_URL}/users/${testUserId}/permissions`, {
                headers: { Authorization: `Bearer ${authToken}` },
                data: {
                    permissions: [
                        { module: 'sales', action: 'create', resource: 'invoices' }
                    ]
                }
            });
            testResult('Revoke Permissions', revokeRes.data.success);
        }

        // 16. Get users with filters
        console.log('16. Testing Get Users with Filters...');
        const filteredRes = await axios.get(`${BASE_URL}/users?role=SALES_USER&status=SUSPENDED`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        testResult('Get Users with Filters', filteredRes.data.success);

        // 17. Test non-admin access
        console.log('17. Testing Non-Admin Access Control...');

        // First, get the accountant user ID
        const accountantUser = usersRes.data.data.users.find(u => u.email === 'accountant@testcompany.com');
        if (accountantUser) {
            accountantUserId = accountantUser.id;

            // Login as accountant
            const accountantLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
                email: 'accountant@testcompany.com',
                password: 'Accountant@123'
            });

            const accountantToken = accountantLoginRes.data.data.tokens.accessToken;

            // Try to create a user (should fail)
            try {
                await axios.post(`${BASE_URL}/users`, {
                    email: 'shouldfail@test.com',
                    password: 'Test@123',
                    confirmPassword: 'Test@123',
                    name: 'Should Fail',
                    role: 'VIEWER',
                    companyId: COMPANY_ID
                }, {
                    headers: { Authorization: `Bearer ${accountantToken}` }
                });
                testResult('Non-Admin Cannot Create User', false, 'Should have been forbidden');
            } catch (error) {
                if (error.response && error.response.status === 403) {
                    testResult('Non-Admin Cannot Create User', true);
                } else {
                    testResult('Non-Admin Cannot Create User', false, error.message);
                }
            }
        }

        // 18. Delete user
        if (testUserId) {
            console.log('18. Testing Delete User...');
            const deleteRes = await axios.delete(`${BASE_URL}/users/${testUserId}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            testResult('Delete User', deleteRes.data.success);

            // Verify deletion
            try {
                await axios.get(`${BASE_URL}/users/${testUserId}`, {
                    headers: { Authorization: `Bearer ${authToken}` }
                });
                testResult('Verify User Deletion', false, 'User still exists');
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    testResult('Verify User Deletion', true);
                } else {
                    testResult('Verify User Deletion', false, error.message);
                }
            }
        }

        // 19. Test logout
        console.log('19. Testing Logout...');
        const logoutRes = await axios.post(`${BASE_URL}/auth/logout`, {}, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        testResult('Logout', logoutRes.data.success);

    } catch (error) {
        console.error('Test error:', error.response?.data || error.message);
    }

    // Print summary
    console.log(`\n${BLUE}========================================${NC}`);
    console.log(`${BLUE}Test Summary${NC}`);
    console.log(`${BLUE}========================================${NC}`);
    console.log(`Total Tests: ${testsRun}`);
    console.log(`${GREEN}Passed: ${testsPassed}${NC}`);
    console.log(`${RED}Failed: ${testsFailed}${NC}`);

    const passRate = ((testsPassed / testsRun) * 100).toFixed(1);
    console.log(`Pass Rate: ${passRate}%`);

    if (testsFailed === 0) {
        console.log(`\n${GREEN}All tests passed successfully!${NC}`);
    } else {
        console.log(`\n${RED}Some tests failed. Please review the results.${NC}`);
    }

    // Save results to JSON
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            total: testsRun,
            passed: testsPassed,
            failed: testsFailed,
            passRate: passRate
        },
        tests: testResults
    };

    const fs = await import('fs/promises');
    await fs.writeFile('test-report.json', JSON.stringify(report, null, 2));
    console.log('\nDetailed report saved to test-report.json');
}

// Run tests
runTests().catch(console.error);