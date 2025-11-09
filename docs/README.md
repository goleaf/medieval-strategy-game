# Documentation

Welcome to the Medieval Strategy Game documentation. This comprehensive guide covers all aspects of the game, from development to administration.

## 📁 Documentation Structure

```
docs/
├── README.md              # This file
├── ../AGENTS.md           # Contributor onboarding and workflow guide
├── CHANGELOG.md           # Version history and changes
├── admin/                 # Administrative features
│   ├── overview.md        # Admin features overview
│   ├── world-configuration.md
│   ├── speed-templates.md
│   ├── player-management.md
│   ├── error-logs.md
│   ├── admin-authentication.md
│   ├── bulk-operations.md
│   ├── action-tracking.md
│   └── tribal-wars-world-types.md  # Presets + switchboard checklist + admin UI link
├── features/              # Game features
│   ├── beginner-protection.md
│   ├── new-player-experience.md   # Tutorial quests, advisors, mentor program
│   ├── resource-system.md
│   ├── combat-resolution.md   # Detailed Travian-style battle pipeline
│   ├── market-trading.md       # Marketplace & merchant trading spec with printable logistics checklists
│   ├── subsystem-effects.md
│   ├── troop-system.md
│   ├── asymmetric-mechanics.md   # Gaul/Roman/Teuton asymmetric spec
│   ├── map-vision-system.md      # Fog-of-war & recon design
│   ├── tribal-wars-endgames.md   # Domination, Rune Wars, and Relics reference
│   ├── tribal-wars-endgame-checklist.md  # Printable configuration worksheet
│   ├── ui-ux-tools.md
│   ├── world-map.md        # Coordinate grammar, continents, UI layers, APIs
├── api/                   # API documentation (future)
└── development/           # Development guides (future)
    ├── map-vision.md      # Vision backend notes
    ├── performance-architecture.md  # Caching, DB, asset, and scaling strategy
    ├── security-hardening.md  # Input validation, anti-cheat, and session controls
    └── reserved-names.md
```

For onboarding, start with `AGENTS.md` at the repository root, then dive into the relevant folders above.

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
- **Tribal Wars Presets**: Interactive switchboard with canonical world templates sourced from the admin API
- **Player Management**: Ban, unban, rename, and relocate players
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
- Testing: see `docs/development/testing-strategy.md` for unit, smoke, UI, load, and security testing.
- Operations: see `docs/development/continuous-improvement.md` for performance monitoring, feedback triage, and iteration loops.
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

### Game Features

- **Gaul/Roman/Teuton asymmetric mechanics**: see `docs/features/asymmetric-mechanics.md` for the authoritative trapping, double build-queue, and raid-focus spec.
- **Map & Fog-of-War Vision System**: see `docs/features/map-vision-system.md` for the combined design + implementation plan covering topology, vision sources, recon, contacts, and rollout.
- **Endgame Engine**: see `docs/features/tribal-wars-endgames.md` for the domination, rune, and relic blueprint. Runtime state is exposed through `lib/game-services/endgame-service.ts` and `/api/world/endgame`.
- `GET /api/protection` - Get player protection status
- `POST /api/protection` - Extend beginner protection
- `GET /api/world/endgame` - Live domination, rune, and relic snapshot for clients

## 🚀 Deployment

### Environment Variables
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
NEXTAUTH_SECRET="auth-secret"
NEXTAUTH_URL="http://localhost:3000"
APP_ORIGIN="http://localhost:3000"
EMAIL_SMTP_HOST="smtp.dev.local"
EMAIL_SMTP_PORT="587"
EMAIL_SMTP_USER="username"
EMAIL_SMTP_PASS="password"
EMAIL_FROM="Medieval Strategy HQ <no-reply@medievalstrategy.game>"
EMAIL_RATE_LIMIT_MAX="20"
EMAIL_RATE_LIMIT_WINDOW_MINUTES="60"
EMAIL_OFFLINE_THRESHOLD_MINUTES="10"
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
- Account settings and preferences (display, gameplay, privacy, performance)
- Notification preferences (global enable, DND, grouping, retention)
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
