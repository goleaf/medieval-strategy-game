# Medieval Strategy Game - SQLite Edition

A full-stack browser-based strategy game built with Next.js, Prisma, and SQLite. Inspired by Tribal Wars.

## 📚 Documentation

📖 **[Complete Documentation](./docs/README.md)** - Comprehensive guides for development, administration, and deployment
🛠️ **[Contributor Guide](./AGENTS.md)** - Project structure, workflows, and coding standards for new contributors

Key documentation areas:
- **Admin Features**: Complete admin dashboard with player management, world configuration, and monitoring
- **API Reference**: Detailed API endpoints with examples
- **Development Guide**: Code standards, architecture, and contribution guidelines
- **Changelog**: Version history and feature updates

## Features

- **Village Management** - Build and expand multiple villages with resource production
- **Military System** - Train 10+ troop types with unique stats and recruitment costs
- **Combat Engine** - Real-time combat resolution with casualties and loot mechanics
- **Troop System** - Config-driven units, missions, siege, and loyalty logic (see `docs/features/troop-system.md`)
- **Marketplace** - Buy and sell resources with other players
- **Tribes & Diplomacy** - Form alliances, declare wars, and collaborate with other players
- **Pathfinding** - A* algorithm for realistic troop movement
- **World Map** - Interactive 1000×1000 grid with continent labels, tribe-colored ownership, mini-map, and distance tooling (`/map`)
- **Admin Dashboard** - Player management, moderation, and world configuration
- **Real-time Updates** - WebSocket-powered live game state synchronization
- **Leaderboard** - Global rankings based on points and conquest

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (file-based, zero-config)
- **Real-time**: WebSocket (ws library)
- **Authentication**: JWT + bcrypt
- **Styling**: Tailwind CSS v4 with shadcn/ui components

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
\`\`\`bash
git clone <repository-url>
cd medieval-strategy-game
\`\`\`

2. Install dependencies
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables
\`\`\`bash
cp .env.example .env.local
# Default SQLite database at prisma/dev.db - no additional config needed!
\`\`\`

4. Initialize the database
\`\`\`bash
npx prisma migrate dev --name init
npx prisma db seed
\`\`\`

5. Start the development server
\`\`\`bash
npm run dev
\`\`\`

Visit \`http://localhost:3000\` to play!

## Database

### SQLite Advantages
- **Zero Configuration** - Database is just a file, no server setup needed
- **Perfect for Development** - Start coding immediately
- **Easy Deployment** - Ship database with your app
- **Great for Small-to-Medium Scale** - Excellent for games up to 1000+ concurrent players

The database file is stored at \`prisma/dev.db\` and is automatically created on first run.

### Migrations

Create a new migration:
\`\`\`bash
npx prisma migrate dev --name <description>
\`\`\`

Apply existing migrations:
\`\`\`bash
npx prisma migrate deploy
\`\`\`

Reset database (development only):
\`\`\`bash
npx prisma migrate reset
\`\`\`

### Scaling to PostgreSQL

If you outgrow SQLite, migration to PostgreSQL is straightforward:

1. Update \`.env.local\`:
\`\`\`
DATABASE_URL="postgresql://user:password@localhost:5432/medieval_strategy"
\`\`\`

2. Run migrations:
\`\`\`bash
npx prisma migrate deploy
\`\`\`

The Prisma schema works identically with PostgreSQL!

## Game Mechanics

### Resources
- **Wood**: Building construction and troop training
- **Stone**: Defensive structures
- **Iron**: Military equipment
- **Gold**: Trade and special buildings
- **Food**: Population sustenance

### Troop Types
- **Warrior** (🗡️): Balanced infantry unit
- **Spearman** (🔱): Defensive unit with high defense
- **Bowman** (🏹): Ranged unit with high attack
- **Horseman** (🐴): Mobile cavalry unit
- **Paladin** (⚜️): Elite unit with balanced stats
- **Eagle Knight** (🦅): Aerial unit with high speed
- **Ram** (🪵): Siege weapon for walls
- **Catapult** (🎯): Long-range siege weapon

### Combat System
Combat uses a power-based algorithm with randomness:
- Attacker Power = Sum of (attack stat × quantity) for all attacking troops
- Defender Power = Sum of (defense stat × quantity) + wall bonus
- Casualty rates based on relative power
- Loot scales with attack victory

### Game Tick (Every 60 seconds)
1. Process resource production for all villages
2. Resolve arrived attacks
3. Expire market orders
4. Update player rankings
5. Spawn barbarian villages

## API Documentation

### Authentication
- \`POST /api/auth/register\` - Create new account
- \`POST /api/auth/login\` - User login

### Villages
- \`GET /api/villages?playerId=...\` - List player villages
- \`POST /api/villages\` - Create new village

### Troops
- \`POST /api/troops/train\` - Train troops in village

### Attacks
- \`POST /api/attacks/launch\` - Launch attack on another village

### Market
- \`GET /api/market/orders?resource=...\` - Browse market orders
- \`POST /api/market/orders\` - Create buy/sell order

### Tribes
- \`GET /api/tribes\` - Tribe leaderboard + creation requirements (points vs premium bypass)
- \`GET /api/tribes?tribeId=<id>&managerId=<playerId>\` - Full roster, pending invites, and applications with permission-aware data
- \`POST /api/tribes\` - Multi-action endpoint for creation, invites, joins, applications, and role/permission updates

### Admin
- \`POST /api/admin/auth/login\` - Admin authentication
- \`POST /api/admin/auth/create-admin\` - Create admin users
- \`GET /api/admin/stats\` - System statistics and monitoring
- \`GET /api/admin/players\` - Player management dashboard
- \`POST /api/admin/players/[id]/ban\` - Ban/unban players
- \`POST /api/admin/players/[id]/rename\` - Rename players
- \`POST /api/admin/players/[id]/move-village\` - Relocate player villages
- \`POST /api/admin/players/bulk\` - Bulk player operations
- \`GET /api/admin/world/config\` - World configuration
- \`POST /api/admin/world/config\` - Update world settings
- \`GET /api/admin/speed-templates\` - Speed templates
- \`POST /api/admin/speed-templates\` - Apply speed configurations

### Leaderboard
- \`GET /api/leaderboard\` - Get global rankings

## Database Schema

The game uses 20+ tables organized into:
- **Users & Authentication**: User, Player, Admin, AuditLog
- **World**: WorldConfig, Continent, Barbarian
- **Villages**: Village, Building, Troop
- **Combat**: Attack, Movement, Defense
- **Economy**: MarketOrder, Resource types
- **Diplomacy**: Tribe, TribeInvite, Alliance, War
- **Communication**: Message

See \`prisma/schema.prisma\` for full schema details.

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables (DATABASE_URL already configured for SQLite)
4. Deploy - Vercel will handle migrations automatically!

SQLite works great on Vercel. The database file persists across deployments.

### Self-Hosted / Docker

\`\`\`bash
docker build -t medieval-strategy .
docker run -p 3000:3000 medieval-strategy
\`\`\`

Ensure the \`prisma/\` directory is writable for the SQLite database file.

### Scaling Strategy

For production scaling:
- **Up to 1,000 players**: SQLite works perfectly
- **1,000-10,000 players**: Consider PostgreSQL with read replicas
- **10,000+ players**: PostgreSQL with sharding or Redis caching

## Game Balance

Adjust in \`lib/game-services/troop-service.ts\`:
- Troop costs and stats
- Combat casualty rates
- Loot amounts

Adjust in \`lib/jobs/game-tick.ts\`:
- Production tick frequency
- Barbarian spawn rate
- Ranking calculation

## Troubleshooting

### Database locked error
SQLite may show "database locked" under high concurrent writes:
- Implement write queuing in game logic
- Use Prisma's connection pooling
- Migrate to PostgreSQL for production

### Migrations failing
\`\`\`bash
# Reset to clean state (DEV ONLY - loses all data)
npx prisma migrate reset

# Re-apply migrations
npx prisma migrate deploy
\`\`\`

## Contributing

Contributions are welcome! Areas for expansion:
- More building types and research trees
- PvE adventures and quests
- Seasonal events
- Mobile app
- Chat system
- Alliance treasury

## License

MIT

## Support

For issues or questions, open an issue on GitHub.
