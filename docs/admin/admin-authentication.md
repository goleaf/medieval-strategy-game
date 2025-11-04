# Admin Authentication

The Admin Authentication system provides secure access control for administrative functions, ensuring only authorized users can perform sensitive operations.

## Features

### JWT Token Authentication
- JSON Web Tokens for stateless authentication
- 24-hour token expiration
- Secure token storage and transmission

### Role-Based Access Control
- Multiple admin roles (MODERATOR, ADMIN, SUPERADMIN)
- Granular permission system
- Future role-based feature access

### Admin User Management
- Create new admin users
- Secure password hashing with bcrypt
- Admin role assignment

## API Endpoints

### Admin Login
```http
POST /api/admin/auth/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-id",
      "username": "admin",
      "displayName": "Administrator",
      "admin": {
        "id": "admin-id",
        "role": "ADMIN"
      }
    }
  }
}
```

### Create Admin User
```http
POST /api/admin/auth/create-admin
```

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Request Body:**
```json
{
  "username": "newadmin",
  "email": "admin@example.com",
  "password": "securepassword123",
  "displayName": "New Administrator",
  "role": "MODERATOR"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "username": "newadmin",
      "email": "admin@example.com",
      "displayName": "New Administrator"
    },
    "admin": {
      "id": "admin-id",
      "role": "MODERATOR"
    }
  },
  "message": "Admin user newadmin created successfully"
}
```

## Usage

### Authentication Flow

1. **Login**: Admin users authenticate with username/password
2. **Token**: Server returns JWT token valid for 24 hours
3. **Requests**: Include token in Authorization header for admin endpoints
4. **Validation**: Middleware validates token and admin permissions

### Client Implementation

```javascript
// Login
const loginResponse = await fetch('/api/admin/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
})

const { token } = await loginResponse.json()

// Store token (localStorage, secure cookie, etc.)
localStorage.setItem('adminToken', token)

// Use token for authenticated requests
const response = await fetch('/api/admin/world/config', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

### Server Middleware

```typescript
import { requireAdminAuth } from '@/app/api/admin/middleware'

export const GET = requireAdminAuth(async (req: NextRequest, context) => {
  // context.admin contains authenticated admin info
  const { adminId, admin } = context.admin

  // Access admin information
  console.log('Admin role:', admin.role)

  // Proceed with admin-only logic
  return NextResponse.json({ success: true })
})
```

## Security Features

### Password Security
- bcrypt hashing with salt rounds (12)
- Minimum 8 character password requirement
- Secure password storage

### Token Security
- HS256 algorithm for JWT signing
- 24-hour expiration
- Environment-based secret key

### Access Control
- All admin endpoints protected by middleware
- Role-based permissions (future enhancement)
- Request logging and monitoring

## Database Schema

```prisma
model Admin {
  id              String    @id @default(cuid())

  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  role            AdminRole

  createdAt       DateTime  @default(now())

  // Relations
  auditLogs       AuditLog[]

  @@index([userId])
}

enum AdminRole {
  MODERATOR
  ADMIN
  SUPERADMIN
}

model AuditLog {
  id              String    @id @default(cuid())

  adminId         String
  admin           Admin     @relation(fields: [adminId], references: [id], onDelete: Cascade)

  action          String
  details         String?
  targetType      String
  targetId        String

  createdAt       DateTime  @default(now())

  @@index([adminId])
  @@index([targetType, targetId])
}
```

## Role Definitions

### MODERATOR
- Basic player management (ban, unban, rename)
- Map tools access
- View statistics and error logs
- Limited configuration access

### ADMIN
- All MODERATOR permissions
- World configuration management
- Speed template management
- Unit balance viewing
- Bulk operations

### SUPERADMIN
- All ADMIN permissions
- Admin user creation and management
- System-wide configuration changes
- Audit log access

## Best Practices

### Token Management
- Store tokens securely (httpOnly cookies preferred)
- Implement token refresh mechanism
- Clear tokens on logout
- Handle token expiration gracefully

### Password Policies
- Enforce strong password requirements
- Implement password change functionality
- Consider password expiration policies

### Session Security
- Implement proper logout functionality
- Monitor for suspicious login attempts
- Log authentication events

### Error Handling
- Don't expose authentication errors that could aid attacks
- Log authentication failures for monitoring
- Implement rate limiting for login attempts

## Integration

Admin authentication integrates with:
- **Admin Dashboard**: Automatic token management
- **API Routes**: Middleware-based protection
- **Audit Logging**: All admin actions tracked
- **Error Monitoring**: Authentication failures logged

## Future Enhancements

- Two-factor authentication (2FA)
- Role-based permissions matrix
- Admin session management
- Password reset functionality
- Login attempt rate limiting
- Geographic access restrictions
