#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8020/api/v1"
COMPANY_ID="77fa8cfc-4e6d-43db-8af1-042baa4fb822"

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
TEST_RESULTS=""

# Function to print test results
print_test_result() {
    local test_name=$1
    local result=$2
    local response=$3
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        TEST_RESULTS="$TEST_RESULTS\n✓ $test_name: PASS"
    else
        echo -e "${RED}✗${NC} $test_name"
        echo -e "${RED}Response: $response${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TEST_RESULTS="$TEST_RESULTS\n✗ $test_name: FAIL - $response"
    fi
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing Authentication Endpoints${NC}"
echo -e "${BLUE}========================================${NC}\n"

# 1. Test User Registration
echo -e "${YELLOW}1. Testing User Registration${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@testcompany.com",
    "password": "SuperAdmin@123",
    "confirmPassword": "SuperAdmin@123",
    "name": "Super Admin",
    "phone": "9876543210",
    "companyId": "'$COMPANY_ID'",
    "role": "SUPERADMIN"
  }')

echo "Register Response: $REGISTER_RESPONSE"

if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
    print_test_result "User Registration" "PASS" "$REGISTER_RESPONSE"
    # Extract tokens
    ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
    REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE" | sed -n 's/.*"refreshToken":"\([^"]*\)".*/\1/p')
    USER_ID=$(echo "$REGISTER_RESPONSE" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
    echo "Access Token extracted: ${ACCESS_TOKEN:0:20}..."
else
    print_test_result "User Registration" "FAIL" "$REGISTER_RESPONSE"
fi

# Wait a moment before next test
sleep 1

# 2. Test User Login
echo -e "\n${YELLOW}2. Testing User Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@testcompany.com",
    "password": "SuperAdmin@123"
  }')

echo "Login Response: $LOGIN_RESPONSE"

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    print_test_result "User Login" "PASS" "$LOGIN_RESPONSE"
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
    REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | sed -n 's/.*"refreshToken":"\([^"]*\)".*/\1/p')
    echo "Access Token from login: ${ACCESS_TOKEN:0:20}..."
else
    print_test_result "User Login" "FAIL" "$LOGIN_RESPONSE"
fi

# 3. Test Get Current User
echo -e "\n${YELLOW}3. Testing Get Current User${NC}"
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Me Response: $ME_RESPONSE"

if echo "$ME_RESPONSE" | grep -q '"success":true'; then
    print_test_result "Get Current User" "PASS" "$ME_RESPONSE"
else
    print_test_result "Get Current User" "FAIL" "$ME_RESPONSE"
fi

# 4. Test Verify Token
echo -e "\n${YELLOW}4. Testing Verify Token${NC}"
VERIFY_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/verify" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Verify Response: $VERIFY_RESPONSE"

if echo "$VERIFY_RESPONSE" | grep -q '"success":true\|"valid":true'; then
    print_test_result "Verify Token" "PASS" "$VERIFY_RESPONSE"
else
    print_test_result "Verify Token" "FAIL" "$VERIFY_RESPONSE"
fi

# 5. Test Refresh Token
echo -e "\n${YELLOW}5. Testing Refresh Token${NC}"
REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/refresh-token" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

echo "Refresh Response: $REFRESH_RESPONSE"

if echo "$REFRESH_RESPONSE" | grep -q '"success":true'; then
    print_test_result "Refresh Token" "PASS" "$REFRESH_RESPONSE"
    NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
    if [ ! -z "$NEW_ACCESS_TOKEN" ]; then
        ACCESS_TOKEN=$NEW_ACCESS_TOKEN
        echo "New Access Token: ${ACCESS_TOKEN:0:20}..."
    fi
else
    print_test_result "Refresh Token" "FAIL" "$REFRESH_RESPONSE"
fi

# 6. Test Change Password
echo -e "\n${YELLOW}6. Testing Change Password${NC}"
CHANGE_PWD_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/change-password" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "SuperAdmin@123",
    "newPassword": "NewSuperAdmin@456",
    "confirmPassword": "NewSuperAdmin@456"
  }')

echo "Change Password Response: $CHANGE_PWD_RESPONSE"

if echo "$CHANGE_PWD_RESPONSE" | grep -q '"success":true'; then
    print_test_result "Change Password" "PASS" "$CHANGE_PWD_RESPONSE"

    # Wait a moment
    sleep 1

    # Test login with new password
    NEW_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "superadmin@testcompany.com",
        "password": "NewSuperAdmin@456"
      }')

    if echo "$NEW_LOGIN_RESPONSE" | grep -q '"success":true'; then
        print_test_result "Login with New Password" "PASS" "$NEW_LOGIN_RESPONSE"
        ACCESS_TOKEN=$(echo "$NEW_LOGIN_RESPONSE" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
        REFRESH_TOKEN=$(echo "$NEW_LOGIN_RESPONSE" | sed -n 's/.*"refreshToken":"\([^"]*\)".*/\1/p')
    else
        print_test_result "Login with New Password" "FAIL" "$NEW_LOGIN_RESPONSE"
    fi
else
    print_test_result "Change Password" "FAIL" "$CHANGE_PWD_RESPONSE"
fi

# 7. Test Logout
echo -e "\n${YELLOW}7. Testing Logout${NC}"
LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Logout Response: $LOGOUT_RESPONSE"

if echo "$LOGOUT_RESPONSE" | grep -q '"success":true'; then
    print_test_result "User Logout" "PASS" "$LOGOUT_RESPONSE"

    # Wait a moment
    sleep 1

    # Verify token is invalidated
    VERIFY_AFTER_LOGOUT=$(curl -s -X GET "$BASE_URL/auth/me" \
      -H "Authorization: Bearer $ACCESS_TOKEN")

    if echo "$VERIFY_AFTER_LOGOUT" | grep -qi 'unauthorized\|invalid\|expired\|AUTH_TOKEN_INVALID'; then
        print_test_result "Token Invalidated After Logout" "PASS" "$VERIFY_AFTER_LOGOUT"
    else
        print_test_result "Token Invalidated After Logout" "FAIL" "Token still valid after logout"
    fi
else
    print_test_result "User Logout" "FAIL" "$LOGOUT_RESPONSE"
fi

# Additional Testing: Create another user with different role
echo -e "\n${YELLOW}8. Testing Create User with Different Roles${NC}"

# Login again to get fresh token
LOGIN_AGAIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@testcompany.com",
    "password": "NewSuperAdmin@456"
  }')

if echo "$LOGIN_AGAIN" | grep -q '"success":true'; then
    ACCESS_TOKEN=$(echo "$LOGIN_AGAIN" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')

    # Create an accountant user
    ACCOUNTANT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "accountant@testcompany.com",
        "password": "Accountant@123",
        "confirmPassword": "Accountant@123",
        "name": "Test Accountant",
        "phone": "9876543211",
        "companyId": "'$COMPANY_ID'",
        "role": "ACCOUNTANT"
      }')

    if echo "$ACCOUNTANT_RESPONSE" | grep -q '"success":true'; then
        print_test_result "Create Accountant User" "PASS" "$ACCOUNTANT_RESPONSE"
    else
        print_test_result "Create Accountant User" "FAIL" "$ACCOUNTANT_RESPONSE"
    fi
fi

# Print summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}All authentication tests passed!${NC}"
else
    echo -e "\n${RED}Some tests failed. Please review the results above.${NC}"
fi

# Save results to file
echo -e "\n\nDetailed Results:" > auth-test-results.txt
echo -e "$TEST_RESULTS" >> auth-test-results.txt
echo "Results saved to auth-test-results.txt"