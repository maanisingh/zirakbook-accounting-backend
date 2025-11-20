# Authentication Module - Quick Start Guide

## Installation & Setup

### 1. Install Dependencies
```bash
cd /root/zirabook-accounting-full/backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Setup Database
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Open Prisma Studio to create a company
npx prisma studio
```

### 4. Start Server
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication Endpoints

#### Register User
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Pass@123",
  "confirmPassword": "Pass@123",
  "name": "John Doe",
  "phone": "1234567890",
  "role": "VIEWER",
  "companyId": "uuid-here"
}
```

#### Login
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Pass@123"
}
```

#### Get Current User
```bash
GET /api/v1/auth/me
Authorization: Bearer {accessToken}
```

#### Refresh Token
```bash
POST /api/v1/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Logout
```bash
POST /api/v1/auth/logout
Authorization: Bearer {accessToken}
```

#### Change Password
```bash
POST /api/v1/auth/change-password
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "currentPassword": "OldPass@123",
  "newPassword": "NewPass@123",
  "confirmPassword": "NewPass@123"
}
```

### User Management Endpoints

#### Create User (Admin only)
```bash
POST /api/v1/users
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "Pass@123",
  "name": "New User",
  "role": "ACCOUNTANT",
  "companyId": "uuid-here"
}
```

#### Get All Users
```bash
GET /api/v1/users?page=1&limit=20&role=ACCOUNTANT&status=ACTIVE&search=john
Authorization: Bearer {accessToken}
```

#### Get User by ID
```bash
GET /api/v1/users/{userId}
Authorization: Bearer {accessToken}
```

#### Update User
```bash
PATCH /api/v1/users/{userId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Updated Name",
  "phone": "9876543210",
  "role": "MANAGER"
}
```

#### Delete User (Admin only)
```bash
DELETE /api/v1/users/{userId}
Authorization: Bearer {accessToken}
```

#### Activate User (Admin only)
```bash
POST /api/v1/users/{userId}/activate
Authorization: Bearer {accessToken}
```

#### Deactivate User (Admin only)
```bash
POST /api/v1/users/{userId}/deactivate
Authorization: Bearer {accessToken}
```

#### Change User Status (Admin only)
```bash
POST /api/v1/users/{userId}/status
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "SUSPENDED",
  "reason": "Policy violation"
}
```

#### Get User Statistics (Admin only)
```bash
GET /api/v1/users/stats?companyId={companyId}
Authorization: Bearer {accessToken}
```

#### Get User Permissions
```bash
GET /api/v1/users/{userId}/permissions
Authorization: Bearer {accessToken}
```

#### Assign Permissions (Admin only)
```bash
POST /api/v1/users/{userId}/permissions
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "permissionIds": [
    "permission-uuid-1",
    "permission-uuid-2"
  ]
}
```

#### Revoke Permissions (Admin only)
```bash
DELETE /api/v1/users/{userId}/permissions
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "permissionIds": [
    "permission-uuid-1",
    "permission-uuid-2"
  ]
}
```

## User Roles

- `SUPERADMIN` - Full system access
- `COMPANY_ADMIN` - Company-level administration
- `ACCOUNTANT` - Accounting operations
- `MANAGER` - Management operations
- `SALES_USER` - Sales operations
- `PURCHASE_USER` - Purchase operations
- `INVENTORY_USER` - Inventory operations
- `VIEWER` - Read-only access

## User Status

- `ACTIVE` - User can login and use system
- `INACTIVE` - User cannot login
- `SUSPENDED` - User account suspended (with reason)

## Response Format

### Success Response
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": {}
}
```

### Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "errorCode": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address",
      "type": "string.email"
    }
  ]
}
```

### Paginated Response
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Data retrieved successfully",
  "data": [],
  "metadata": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

## Common Error Codes

- `AUTH_INVALID_CREDENTIALS` - Invalid email or password
- `AUTH_TOKEN_EXPIRED` - Token has expired
- `AUTH_TOKEN_INVALID` - Invalid or malformed token
- `AUTH_INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `AUTH_ACCOUNT_SUSPENDED` - Account has been suspended
- `VALIDATION_ERROR` - Request validation failed
- `DB_RECORD_NOT_FOUND` - Requested record not found
- `DB_DUPLICATE_ENTRY` - Duplicate entry (e.g., email)
- `RATE_LIMIT_EXCEEDED` - Too many requests

## Testing with cURL

### 1. Register First User
```bash
curl -X POST http://localhost:8003/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin@123",
    "confirmPassword": "Admin@123",
    "name": "Admin User",
    "companyId": "your-company-uuid",
    "role": "COMPANY_ADMIN"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:8003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin@123"
  }'
```
Save the `accessToken` from response.

### 3. Get Current User
```bash
curl http://localhost:8003/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Create Another User
```bash
curl -X POST http://localhost:8003/api/v1/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "accountant@test.com",
    "password": "Acct@123",
    "name": "Accountant User",
    "role": "ACCOUNTANT",
    "companyId": "your-company-uuid"
  }'
```

### 5. List Users
```bash
curl "http://localhost:8003/api/v1/users?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Environment Variables

Key variables to configure in `.env`:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/zirakbook_db

# JWT Secrets (change these!)
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=8003
NODE_ENV=development
```

## Troubleshooting

### Issue: Cannot connect to database
**Solution**: Check DATABASE_URL in .env and ensure PostgreSQL is running

### Issue: Cannot connect to Redis
**Solution**: Check REDIS_HOST and REDIS_PORT, ensure Redis is running

### Issue: JWT_SECRET not defined
**Solution**: Add JWT_SECRET to .env file

### Issue: Company not found during registration
**Solution**: Create a company first using Prisma Studio

### Issue: Rate limit exceeded
**Solution**: Wait 15 minutes or adjust RATE_LIMIT_MAX_REQUESTS in .env

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong JWT secrets (min 32 characters)
3. Configure proper CORS_ORIGIN
4. Set up proper Redis instance
5. Use managed PostgreSQL database
6. Enable HTTPS
7. Set up monitoring and logging
8. Configure rate limiting appropriately
9. Regular security updates
10. Database backups

## Development Tips

- Use Prisma Studio for database management: `npx prisma studio`
- View logs in `./logs` directory
- Check `combined.log` for all logs, `error.log` for errors only
- Use Thunder Client or Postman for API testing
- Enable debug logging: set `LOG_LEVEL=debug` in .env

## Next Steps

1. ✅ Authentication Module (Complete)
2. Inventory Module
3. Sales Module
4. Purchase Module
5. Accounting Module
6. Reports Module

---

For detailed documentation, see AUTH_MODULE_DOCUMENTATION.md
