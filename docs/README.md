# Documentation

Welcome to the Medieval Strategy Game documentation. This comprehensive guide covers all aspects of the game, from development to administration.

## 📁 Documentation Structure

```
docs/
├── README.md              # This file
├── CHANGELOG.md           # Version history and changes
├── admin/                 # Administrative features
│   ├── overview.md        # Admin features overview
│   ├── world-configuration.md
│   ├── speed-templates.md
│   ├── player-management.md
│   ├── map-tools.md
│   ├── error-logs.md
│   ├── admin-authentication.md
│   ├── bulk-operations.md
│   └── action-tracking.md
├── features/              # Game features
│   ├── beginner-protection.md
│   ├── resource-system.md
│   ├── subsystem-effects.md
│   ├── troop-system.md
│   ├── ui-ux-tools.md
├── api/                   # API documentation (future)
└── development/           # Development guides (future)
```

## 🎮 Game Overview

Medieval Strategy Game is a real-time strategy game featuring:
- Village building and resource management
- Military combat and troop training
- Multiplayer interactions and alliances
- Real-time game mechanics with configurable speed
- Beginner protection system for new players
- Config-driven troop, siege, and loyalty system (`docs/features/troop-system.md`)

## 👨‍💼 Administration

The game includes a comprehensive admin dashboard with the following capabilities:

### Core Features
- **World Configuration**: Adjust game speed, production rates, and global settings
- **Speed Templates**: Apply predefined game speed configurations
- **Player Management**: Ban, unban, rename, and relocate players
- **Map Tools**: Spawn barbarians, relocate villages, clean up empty areas
- **Error Monitoring**: View system errors and performance metrics

### Advanced Features
- **Admin Authentication**: Secure JWT-based admin access system
- **Bulk Operations**: Mass player management actions
- **Action Tracking**: Comprehensive audit logging and statistics
- **Role Management**: Hierarchical admin permissions

### Quick Start
1. Access admin dashboard at `/admin/dashboard`
2. Authenticate with admin credentials
3. Use tabs to navigate different management areas
4. Monitor system health and player activity

## 🛠️ Development

### Project Structure
```
├── app/                   # Next.js 13+ app router
├── components/           # React components
├── lib/                  # Business logic and utilities
├── prisma/              # Database schema and migrations
├── docs/                # Documentation
└── public/              # Static assets
```

### Key Technologies
- **Framework**: Next.js 13+ with App Router
- **Database**: SQLite with Prisma ORM
- **Styling**: Tailwind CSS with shadcn/ui components
- **Authentication**: JWT tokens
- **Real-time**: WebSocket connections

### Development Guidelines
- Follow the `.cursorrules` for consistent code style
- Use TypeScript for type safety
- Implement proper error handling
- Write comprehensive tests (future)
- Document all features in `/docs`

## 📊 API Reference

### Admin Endpoints
- `GET /api/admin/stats` - System statistics and error logs
- `GET /api/admin/players` - Player list with management options
- `GET /api/admin/world/config` - Current world configuration
- `POST /api/admin/world/config` - Update world configuration
- `GET /api/admin/speed-templates` - Available speed templates
- `POST /api/admin/speed-templates` - Apply speed template

### Authentication
- `POST /api/admin/auth/login` - Admin login
- `POST /api/admin/auth/create-admin` - Create new admin user

### Player Management
- `POST /api/admin/players/{id}/ban` - Ban player
- `POST /api/admin/players/{id}/unban` - Unban player
- `POST /api/admin/players/{id}/rename` - Rename player
- `POST /api/admin/players/{id}/move-village` - Move player village
- `POST /api/admin/players/bulk` - Bulk player operations

### Map Tools
- `POST /api/admin/map/spawn-barbarian` - Spawn barbarian village
- `POST /api/admin/map/relocate-tile` - Relocate village
- `POST /api/admin/map/wipe-empty` - Remove empty villages

### Game Features
- `GET /api/protection` - Get player protection status
- `POST /api/protection` - Extend beginner protection

## 🚀 Deployment

### Environment Variables
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
NEXTAUTH_SECRET="auth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Build Commands
```bash
npm install
npx prisma migrate dev
npm run build
npm start
```

### Production Considerations
- Use PostgreSQL for production database
- Implement proper session management
- Set up monitoring and alerting
- Configure backup procedures
- Enable HTTPS and security headers

## 📈 Monitoring

### Key Metrics
- Player activity and retention
- System performance and response times
- Error rates and types
- Database query performance
- Admin action frequency

### Tools
- Built-in admin dashboard statistics
- Error logging and tracking
- Audit log analysis
- Performance monitoring (future)

## 🤝 Contributing

1. Follow the `.cursorrules` guidelines
2. Create feature branches for new work
3. Write comprehensive documentation
4. Test changes thoroughly
5. Update changelog for significant changes

### Documentation Standards
- Create documentation for all new features
- Update existing docs when features change
- Use consistent formatting and structure
- Include code examples and API references

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation first
- Review existing issues
- Create detailed bug reports
- Provide feature requests with use cases

---

**Last Updated**: January 4, 2025
**Version**: Unreleased
