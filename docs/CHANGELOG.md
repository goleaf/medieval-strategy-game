# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Complete admin dashboard with all management features ✅
- Speed templates system for game configuration ✅
- Player management (ban, unban, rename, move village) ✅
- Map tools (spawn barbarians, relocate tiles, wipe empty villages) ✅
- Error logging and monitoring system ✅
- World configuration management ✅
- **Database-backed unit balance system with TroopBalance model, transaction-safe updates, and live editor** ✅
- **Map visualization dashboard with interactive world overview** ✅
- **Admin notifications system with severity levels, types, and read/unread tracking** ✅
- **Player analytics and reporting dashboard backed by a dedicated analytics API** ✅
- **WebSocket real-time statistics system with dedicated server and React hook** ✅
- **System maintenance and server health monitoring backed by Maintenance models and cleanup API** ✅
- **Admin messaging system for direct player communication using AdminMessage models** ✅
- **Advanced player search with powerful filtering capabilities** ✅
- Real-time statistics dashboard ✅
- Admin authentication system with JWT tokens ✅
- Bulk player operations (mass ban, unban, delete) ✅
- Comprehensive action tracking and audit logging ✅
- Admin user creation and role management ✅
- Comprehensive API documentation ✅
- Cursor rules for consistent development ✅
- Organized documentation structure in `/docs` ✅
- Individual feature documentation for all admin functions ✅
- Browser testing and verification of all admin features ✅
- Proper file organization and structure ✅

### Changed
- Reorganized project structure with proper documentation
- Moved admin features documentation to `/docs/admin/`
- Updated file organization for better maintainability
- Enhanced UI components with shadcn/ui
- Updated all admin API routes with proper authentication
- Hardened error handling and response consistency across the stack
- Created modular admin component architecture
- Established consistent API response formats
- Implemented real-time action tracking and statistics processing
- Expanded audit logging coverage for security and compliance
- Enhanced validation system for unit statistics
- Implemented connection health monitoring and automatic reconnection
- Enhanced admin dashboard with 5 additional feature tabs
- Added TypeScript interfaces for better type safety
- Enhanced input validation and security measures
- Improved database query optimization

### Fixed
- Fixed admin authentication middleware implementation
- Resolved JWT token authentication issues

## [1.0.0] - 2025-01-04

### Added
- Initial medieval strategy game implementation
- Basic game mechanics (villages, resources, troops, buildings)
- Authentication system
- Real-time game ticks and production
- Combat system with attack/defense calculations
- Market system for resource trading
- Tribe system for player alliances
- Leaderboard and ranking system
- Basic admin features for world configuration

### Infrastructure
- Next.js 13+ with App Router
- Prisma ORM with SQLite database
- Tailwind CSS for styling
- WebSocket support for real-time updates
- RESTful API architecture
- TypeScript for type safety

---

## Types of changes
- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` in case of vulnerabilities

## Versioning
We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/your/project/tags).

## Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.
