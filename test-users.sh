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
        echo -e "${RED}Response: ${response:0:200}...${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TEST_RESULTS="$TEST_RESULTS\n✗ $test_name: FAIL"
    fi
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing User Management Endpoints${NC}"
echo -e "${BLUE}========================================${NC}\n"

# First, login to get access token
echo -e "${YELLOW}Logging in as SuperAdmin...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@testcompany.com",
    "password": "NewSuperAdmin@456"
  }')

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
echo "Access Token obtained: ${ACCESS_TOKEN:0:30}..."

# 1. Test Get All Users
echo -e "\n${YELLOW}1. Testing Get All Users${NC}"
USERS_RESPONSE=$(curl -s -X GET "$BASE_URL/users" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$USERS_RESPONSE" | grep -q '"success":true'; then
    print_test_result "Get All Users" "PASS" "$USERS_RESPONSE"
else
    print_test_result "Get All Users" "FAIL" "$USERS_RESPONSE"
fi

# 2. Test Create New User
echo -e "\n${YELLOW}2. Testing Create New User${NC}"
CREATE_USER_RESPONSE=$(curl -s -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@testcompany.com",
    "password": "Manager@123",
    "confirmPassword": "Manager@123",
    "name": "Test Manager",
    "phone": "9876543222",
    "role": "MANAGER",
    "companyId": "'$COMPANY_ID'"
  }')

if echo "$CREATE_USER_RESPONSE" | grep -q '"success":true'; then
    print_test_result "Create New User" "PASS" "$CREATE_USER_RESPONSE"
    NEW_USER_ID=$(echo "$CREATE_USER_RESPONSE" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
    echo "New User ID: $NEW_USER_ID"
else
    print_test_result "Create New User" "FAIL" "$CREATE_USER_RESPONSE"
fi

# 3. Test Get User by ID
echo -e "\n${YELLOW}3. Testing Get User by ID${NC}"
if [ ! -z "$NEW_USER_ID" ]; then
    GET_USER_RESPONSE=$(curl -s -X GET "$BASE_URL/users/$NEW_USER_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN")

    if echo "$GET_USER_RESPONSE" | grep -q '"success":true'; then
        print_test_result "Get User by ID" "PASS" "$GET_USER_RESPONSE"
    else
        print_test_result "Get User by ID" "FAIL" "$GET_USER_RESPONSE"
    fi
else
    print_test_result "Get User by ID" "FAIL" "No user ID available"
fi

# 4. Test Update User
echo -e "\n${YELLOW}4. Testing Update User${NC}"
if [ ! -z "$NEW_USER_ID" ]; then
    UPDATE_USER_RESPONSE=$(curl -s -X PATCH "$BASE_URL/users/$NEW_USER_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Updated Manager Name",
        "phone": "9876543333"
      }')

    if echo "$UPDATE_USER_RESPONSE" | grep -q '"success":true'; then
        print_test_result "Update User" "PASS" "$UPDATE_USER_RESPONSE"
    else
        print_test_result "Update User" "FAIL" "$UPDATE_USER_RESPONSE"
    fi
else
    print_test_result "Update User" "FAIL" "No user ID available"
fi

# 5. Test Get User Stats
echo -e "\n${YELLOW}5. Testing Get User Stats${NC}"
STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/users/stats" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$STATS_RESPONSE" | grep -q '"success":true'; then
    print_test_result "Get User Stats" "PASS" "$STATS_RESPONSE"
else
    print_test_result "Get User Stats" "FAIL" "$STATS_RESPONSE"
fi

# 6. Test Deactivate User
echo -e "\n${YELLOW}6. Testing Deactivate User${NC}"
if [ ! -z "$NEW_USER_ID" ]; then
    DEACTIVATE_RESPONSE=$(curl -s -X POST "$BASE_URL/users/$NEW_USER_ID/deactivate" \
      -H "Authorization: Bearer $ACCESS_TOKEN")

    if echo "$DEACTIVATE_RESPONSE" | grep -q '"success":true'; then
        print_test_result "Deactivate User" "PASS" "$DEACTIVATE_RESPONSE"
    else
        print_test_result "Deactivate User" "FAIL" "$DEACTIVATE_RESPONSE"
    fi
else
    print_test_result "Deactivate User" "FAIL" "No user ID available"
fi

# 7. Test Activate User
echo -e "\n${YELLOW}7. Testing Activate User${NC}"
if [ ! -z "$NEW_USER_ID" ]; then
    ACTIVATE_RESPONSE=$(curl -s -X POST "$BASE_URL/users/$NEW_USER_ID/activate" \
      -H "Authorization: Bearer $ACCESS_TOKEN")

    if echo "$ACTIVATE_RESPONSE" | grep -q '"success":true'; then
        print_test_result "Activate User" "PASS" "$ACTIVATE_RESPONSE"
    else
        print_test_result "Activate User" "FAIL" "$ACTIVATE_RESPONSE"
    fi
else
    print_test_result "Activate User" "FAIL" "No user ID available"
fi

# 8. Test Change User Status
echo -e "\n${YELLOW}8. Testing Change User Status${NC}"
if [ ! -z "$NEW_USER_ID" ]; then
    STATUS_RESPONSE=$(curl -s -X POST "$BASE_URL/users/$NEW_USER_ID/status" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"status": "SUSPENDED"}')

    if echo "$STATUS_RESPONSE" | grep -q '"success":true'; then
        print_test_result "Change User Status" "PASS" "$STATUS_RESPONSE"
    else
        print_test_result "Change User Status" "FAIL" "$STATUS_RESPONSE"
    fi
else
    print_test_result "Change User Status" "FAIL" "No user ID available"
fi

# 9. Test Get User Permissions
echo -e "\n${YELLOW}9. Testing Get User Permissions${NC}"
if [ ! -z "$NEW_USER_ID" ]; then
    PERMS_RESPONSE=$(curl -s -X GET "$BASE_URL/users/$NEW_USER_ID/permissions" \
      -H "Authorization: Bearer $ACCESS_TOKEN")

    if echo "$PERMS_RESPONSE" | grep -q '"success":true'; then
        print_test_result "Get User Permissions" "PASS" "$PERMS_RESPONSE"
    else
        print_test_result "Get User Permissions" "FAIL" "$PERMS_RESPONSE"
    fi
else
    print_test_result "Get User Permissions" "FAIL" "No user ID available"
fi

# 10. Test Assign Permissions
echo -e "\n${YELLOW}10. Testing Assign Permissions${NC}"
if [ ! -z "$NEW_USER_ID" ]; then
    ASSIGN_PERMS_RESPONSE=$(curl -s -X POST "$BASE_URL/users/$NEW_USER_ID/permissions" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "permissions": [
          {
            "module": "inventory",
            "action": "read",
            "resource": "products"
          },
          {
            "module": "sales",
            "action": "create",
            "resource": "invoices"
          }
        ]
      }')

    if echo "$ASSIGN_PERMS_RESPONSE" | grep -q '"success":true'; then
        print_test_result "Assign Permissions" "PASS" "$ASSIGN_PERMS_RESPONSE"
    else
        print_test_result "Assign Permissions" "FAIL" "$ASSIGN_PERMS_RESPONSE"
    fi
else
    print_test_result "Assign Permissions" "FAIL" "No user ID available"
fi

# 11. Test Revoke Permissions
echo -e "\n${YELLOW}11. Testing Revoke Permissions${NC}"
if [ ! -z "$NEW_USER_ID" ]; then
    REVOKE_PERMS_RESPONSE=$(curl -s -X DELETE "$BASE_URL/users/$NEW_USER_ID/permissions" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "permissions": [
          {
            "module": "sales",
            "action": "create",
            "resource": "invoices"
          }
        ]
      }')

    if echo "$REVOKE_PERMS_RESPONSE" | grep -q '"success":true'; then
        print_test_result "Revoke Permissions" "PASS" "$REVOKE_PERMS_RESPONSE"
    else
        print_test_result "Revoke Permissions" "FAIL" "$REVOKE_PERMS_RESPONSE"
    fi
else
    print_test_result "Revoke Permissions" "FAIL" "No user ID available"
fi

# 12. Test Get Users with Filters
echo -e "\n${YELLOW}12. Testing Get Users with Filters${NC}"
FILTERED_USERS_RESPONSE=$(curl -s -X GET "$BASE_URL/users?role=MANAGER&status=SUSPENDED" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$FILTERED_USERS_RESPONSE" | grep -q '"success":true'; then
    print_test_result "Get Users with Filters" "PASS" "$FILTERED_USERS_RESPONSE"
else
    print_test_result "Get Users with Filters" "FAIL" "$FILTERED_USERS_RESPONSE"
fi

# 13. Test Delete User (should be last)
echo -e "\n${YELLOW}13. Testing Delete User${NC}"
if [ ! -z "$NEW_USER_ID" ]; then
    DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/users/$NEW_USER_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN")

    if echo "$DELETE_RESPONSE" | grep -q '"success":true'; then
        print_test_result "Delete User" "PASS" "$DELETE_RESPONSE"

        # Verify user is deleted
        VERIFY_DELETE=$(curl -s -X GET "$BASE_URL/users/$NEW_USER_ID" \
          -H "Authorization: Bearer $ACCESS_TOKEN")

        if echo "$VERIFY_DELETE" | grep -q 'not found\|404'; then
            print_test_result "Verify User Deletion" "PASS" "$VERIFY_DELETE"
        else
            print_test_result "Verify User Deletion" "FAIL" "User still exists"
        fi
    else
        print_test_result "Delete User" "FAIL" "$DELETE_RESPONSE"
    fi
else
    print_test_result "Delete User" "FAIL" "No user ID available"
fi

# Test with non-admin user (accountant)
echo -e "\n${YELLOW}Testing with Non-Admin User (Accountant)${NC}"
ACCOUNTANT_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "accountant@testcompany.com",
    "password": "Accountant@123"
  }')

if echo "$ACCOUNTANT_LOGIN" | grep -q '"success":true'; then
    ACCOUNTANT_TOKEN=$(echo "$ACCOUNTANT_LOGIN" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')

    # Try to create a user (should fail - no admin rights)
    UNAUTHORIZED_CREATE=$(curl -s -X POST "$BASE_URL/users" \
      -H "Authorization: Bearer $ACCOUNTANT_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "test@test.com",
        "password": "Test@123",
        "confirmPassword": "Test@123",
        "name": "Test User",
        "role": "VIEWER",
        "companyId": "'$COMPANY_ID'"
      }')

    if echo "$UNAUTHORIZED_CREATE" | grep -q 'forbidden\|403\|unauthorized'; then
        print_test_result "Non-Admin Cannot Create User" "PASS" "$UNAUTHORIZED_CREATE"
    else
        print_test_result "Non-Admin Cannot Create User" "FAIL" "Should have been forbidden"
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
    echo -e "\n${GREEN}All user management tests passed!${NC}"
else
    echo -e "\n${RED}Some tests failed. Please review the results above.${NC}"
fi

# Save results to file
echo -e "\n\nDetailed Results:" > user-test-results.txt
echo -e "$TEST_RESULTS" >> user-test-results.txt
echo "Results saved to user-test-results.txt"