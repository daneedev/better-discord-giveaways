# better-giveaways

[![npm version](https://badge.fury.io/js/better-giveaways.svg)](https://badge.fury.io/js/better-giveaways)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

A modern, feature-rich Discord giveaway manager with TypeScript support, flexible storage adapters, and comprehensive event system. Built as an improved alternative to existing Discord giveaway packages.

## ✨ Features

- 🎯 **TypeScript Support** - Full type safety and IntelliSense
- 🔧 **Flexible Storage** - Multiple storage adapters (JSON, Sequelize, custom)
- 📡 **Event-Driven** - Comprehensive event system for custom handling
- 🌍 **Internationalization** - Multi-language support (English, Czech)
- 🛡️ **Advanced Requirements** - Role, account age, server join date, and custom checks
- ⚡ **Performance Focused** - Efficient memory usage and response times
- 🔄 **Automatic Recovery** - Restores giveaways after bot restarts
- 🎲 **Reroll Support** - Easy winner rerolling functionality

## 📦 Installation

```bash
# Stable version (latest)
npm install better-giveaways@latest
# Unstable version with beta features (dev)
npm install better-giveaways@dev
```

## 🤖 Example bot

[Beepo's source code](https://github.com/daneedev/Beepo/blob/main/src/commands/giveaway/giveaway.ts)

## 🚀 Quick Start

```typescript
import { Client } from "discord.js";
import { GiveawayManager, JSONAdapter } from "better-giveaways";

const client = new Client({
  intents: ["Guilds", "GuildMessages", "GuildMessageReactions"],
});

// Initialize with JSON storage
const adapter = new JSONAdapter("./giveaways.json");
const giveawayManager = new GiveawayManager(client, adapter, {
  reaction: "🎉",
  botsCanWin: false,
  language: "en",
});

// Start a giveaway
await giveawayManager.start({
  channelId: "123456789012345678",
  prize: "Discord Nitro",
  winnerCount: 1,
  duration: 24 * 60 * 60 * 1000, // 24 hours
  requirements: {
    requiredRoles: ["roleIdHere"],
    accountAgeMin: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days old account
  },
});
```

## 📚 API Reference

### GiveawayManager

#### Constructor

```typescript
new GiveawayManager(client: Client, adapter: BaseAdapter, options: GiveawayManagerOptions)
```

#### Methods

- `start(options: GiveawayOptions): Promise<GiveawayData>` - Start a new giveaway
- `end(giveawayId: string): Promise<void>` - End a giveaway manually
- `reroll(giveawayId: string): Promise<void>` - Reroll giveaway winners
- `getGiveaway(giveawayId: string): Promise<GiveawayData | null>` - Get giveaway data
- `getAllGiveaways(): Promise<GiveawayData[]>` - Get all giveaways
- `deleteGiveaway(giveawayId: string): Promise<void>` - Delete a giveaway

### Storage Adapters

#### JSONAdapter

```typescript
import { JSONAdapter } from "better-giveaways";
const adapter = new JSONAdapter("./data/giveaways.json");
```

#### SequelizeAdapter

```typescript
import { SequelizeAdapter } from "better-giveaways";
import { Sequelize } from "sequelize";

const sequelize = new Sequelize("database", "username", "password", {
  host: "localhost",
  dialect: "mysql",
});
const adapter = new SequelizeAdapter(sequelize);
```

#### Custom Adapter

```typescript
import { BaseAdapter } from "better-giveaways";

class CustomAdapter extends BaseAdapter {
  async save(data: GiveawayData[]): Promise<void> {
    // Your custom save logic
  }

  async load(): Promise<GiveawayData[]> {
    // Your custom load logic
  }
}
```

### Requirements System

```typescript
const requirements = {
  requiredRoles: ["Member", "Active"], // Role names or IDs
  accountAgeMin: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days
  joinedServerBefore: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days
  custom: async (userId: string) => {
    // Your custom logic here
    const user = await client.users.fetch(userId);
    const hasNitro = user.premiumType !== null;

    return {
      passed: hasNitro,
      reason: hasNitro ? "User has Nitro" : "User must have Discord Nitro",
    };
  },
};
```

### Event Handling

```typescript
// Listen to giveaway events
giveawayManager.events.on("giveawayStarted", (giveaway) => {
  console.log(`Giveaway started: ${giveaway.prize}`);
});

giveawayManager.events.on("giveawayEnded", (giveaway, winners) => {
  console.log(
    `Giveaway ended: ${giveaway.prize}, Winners: ${winners.join(", ")}`
  );
});

giveawayManager.events.on("requirementsFailed", (giveaway, user, reason) => {
  console.log(`User ${user.tag} failed requirements: ${reason}`);
});
```

## 🌍 Internationalization

Supported languages:

- `en` - English (default)
- `cs` - Czech

```typescript
const giveawayManager = new GiveawayManager(client, adapter, {
  reaction: "🎉",
  botsCanWin: false,
  language: "cs", // Use Czech language
});
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/daneedev/better-giveaways)
- [npm Package](https://www.npmjs.com/package/better-giveaways)
- [Issue Tracker](https://github.com/daneedev/better-giveaways/issues)

## 📞 Support

If you have any questions or need help, please [open an issue](https://github.com/daneedev/better-giveaways/issues) on GitHub.
