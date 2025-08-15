import {
  Client,
  EmbedBuilder,
  Message,
  MessageFlags,
  MessageReaction,
  TextChannel,
  User,
} from "discord.js";
import {
  GiveawayData,
  GiveawayManagerOptions,
  GiveawayOptions,
} from "./@types";
import { BaseAdapter } from "./storage/BaseAdapter";
import { GiveawayEventEmitter } from "./GiveawayEventEmitter";
import { checkRequirements } from "./RequirementCheck";
import { i18n, t } from "./i18n";

/**
 * GiveawayManager represents a comprehensive manager for creating and managing Discord giveaways.
 *
 *
 * @example
 * ```typescript
 * import { Client } from 'discord.js';
 * import { GiveawayManager, JSONAdapter } from 'better-giveaways';
 *
 * const client = new Client({ intents: ['Guilds', 'GuildMessages', 'GuildMessageReactions'] });
 * const adapter = new JSONAdapter('./giveaways.json');
 *
 * const giveawayManager = new GiveawayManager(client, adapter, {
 *   reaction: '🎉',
 *   botsCanWin: false,
 *   language: 'en'
 * });
 * ```
 */
class GiveawayManager {
  private client: Client;
  private reaction: string;
  private botsCanWin: boolean;
  private adapter: BaseAdapter;
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private collectors: Map<string, any> = new Map(); // Store collectors for cleanup

  /**
   * Event emitter for giveaway-related events.
   *
   * This property provides access to all giveaway events that you can listen to for custom handling.
   *
   * Available events:
   * - `giveawayStarted`: Emitted when a new giveaway is started
   * - `giveawayEnded`: Emitted when a giveaway naturally ends
   * - `giveawayRerolled`: Emitted when a giveaway is rerolled
   * - `giveawayEdited`: Emitted when a giveaway is edited
   * - `reactionAdded`: Emitted when someone reacts to a giveaway
   * - `requirementsFailed`: Emitted when a user fails entry requirements
   * - `requirementsPassed`: Emitted when a user passes entry requirements
   *
   * @example
   * ```typescript
   * // Listen for giveaway events
   * giveawayManager.events.on('giveawayStarted', (giveaway) => {
   *   console.log(`Giveaway started: ${giveaway.prize}`);
   * });
   *
   * giveawayManager.events.on('giveawayEnded', (giveaway, winners) => {
   *   console.log(`Giveaway ended! Winners: ${winners.join(', ')}`);
   * });
   *
   * giveawayManager.events.on('requirementsFailed', (giveaway, user, reason) => {
   *   console.log(`${user.username} failed requirements: ${reason}`);
   * });
   * ```
   */
  public readonly events: GiveawayEventEmitter;

  /**
   * Creates a new GiveawayManager instance.
   *
   * @param client - The Discord.js client instance that will be used for bot operations
   * @param adapter - The storage adapter for persisting giveaway data (JSONAdapter, SequelizeAdapter, etc.)
   * @param options - Configuration options for the giveaway manager
   * @param options.reaction - The emoji reaction users will use to enter giveaways (e.g., '🎉')
   * @param options.botsCanWin - Whether bot accounts are allowed to win giveaways
   * @param options.language - The language for giveaway messages ('en' or 'cs'), defaults to 'en'
   *
   * @example
   * ```typescript
   * const giveawayManager = new GiveawayManager(client, adapter, {
   *   reaction: '🎉',
   *   botsCanWin: false,
   *   language: 'en'
   * });
   * ```
   */
  constructor(
    client: Client,
    adapter: BaseAdapter,
    options: GiveawayManagerOptions
  ) {
    this.client = client;
    this.adapter = adapter;
    this.reaction = options.reaction;
    this.botsCanWin = options.botsCanWin;
    this.events = new GiveawayEventEmitter();

    i18n.changeLanguage(options.language || "en");

    this.restoreTimeouts();
  }

  private buildEmbed(
    options: GiveawayOptions,
    giveaway: GiveawayData
  ): EmbedBuilder {
    const lines: string[] = [
      `${t("react_with")} ${this.reaction} ${t("to_enter")}`,
      `${t("ends")} <t:${Math.floor(giveaway.endAt / 1000)}:R>`,
    ];

    if (options.requirements) {
      const req = options.requirements;
      lines.push(`\n**${t("requirements")}:**`);

      if (req.requiredRoles?.length) {
        lines.push(
          `• ${t("must_role")}: <@&${req.requiredRoles.join(">, <@&")}>`
        );
      }

      if (req.accountAgeMin) {
        lines.push(
          `• ${t("must_account")} <t:${Math.floor(req.accountAgeMin / 1000)}:R>`
        );
      }

      if (req.joinedServerBefore) {
        lines.push(
          `• ${t("must_join")} <t:${Math.floor(
            req.joinedServerBefore / 1000
          )}:D>`
        );
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎉 ${t("giveaway")} - ${options.prize}`)
      .setDescription(lines.join("\n"))
      .setColor("Red");

    return embed;
  }

  /**
   * Starts a new giveaway with the specified options.
   *
   * This method creates a new giveaway, sends an embed message to the specified channel,
   * adds the reaction emoji, sets up automatic ending, and begins collecting reactions.
   *
   * @param options - The configuration for the giveaway
   * @param options.channelId - The Discord channel ID where the giveaway will be posted
   * @param options.prize - The prize description for the giveaway
   * @param options.winnerCount - The number of winners to select
   * @param options.duration - The duration of the giveaway in milliseconds
   * @param options.requirements - Optional entry requirements for participants
   *
   * @returns A Promise that resolves to the created GiveawayData object
   *
   * @throws {Error} When the channel is not found or is not text-based
   *
   * @example
   * ```typescript
   * const giveaway = await giveawayManager.start({
   *   channelId: '123456789',
   *   prize: 'Discord Nitro',
   *   winnerCount: 2,
   *   duration: 24 * 60 * 60 * 1000, // 24 hours
   *   requirements: {
   *     requiredRoles: ['987654321'],
   *     accountAgeMin: Date.now() - (7 * 24 * 60 * 60 * 1000) // 7 days old
   *   }
   * });
   * ```
   */
  public async start(options: GiveawayOptions): Promise<GiveawayData> {
    const endAt = Date.now() + options.duration;
    const giveaway: GiveawayData = {
      giveawayId: this.generateId(),
      channelId: options.channelId,
      prize: options.prize,
      winnerCount: options.winnerCount,
      endAt,
      messageId: null,
      ended: false,
      requirements: options.requirements,
    };

    const channel = await this.client.channels.fetch(options.channelId);
    if (!channel || !channel.isTextBased()) {
      throw new Error("Channel not found or not text-based");
    }

    const embed = this.buildEmbed(options, giveaway);

    const message = await (channel as TextChannel).send({ embeds: [embed] });
    await message.react(this.reaction);

    giveaway.messageId = message.id;
    await this.adapter.save(giveaway);

    this.setTimeoutForGiveaway(giveaway);
    this.events.emit("giveawayStarted", giveaway);

    this.setReactionCollector(giveaway);

    return giveaway;
  }

  /**
   * Ends a giveaway and selects winners.
   *
   * This method retrieves all reactions from the giveaway message, filters out bots (if configured),
   * selects random winners, updates the embed to show the results, and emits appropriate events.
   *
   * @param giveawayId - The unique identifier of the giveaway to end
   * @param rerolled - Whether this is a reroll operation (affects which event is emitted)
   *
   * @returns A Promise that resolves when the giveaway has been ended
   *
   * @example
   * ```typescript
   * // End a giveaway normally
   * await giveawayManager.end('abc123def');
   *
   * // The method is also called automatically when the giveaway duration expires
   * ```
   *
   * @internal This method is called automatically when giveaways expire, but can also be called manually
   */
  public async end(giveawayId: string, rerolled: boolean): Promise<void> {
    const giveaway = await this.adapter.get(giveawayId);
    if (!giveaway || giveaway.ended) return;

    const channel = await this.client.channels.fetch(giveaway.channelId);
    if (!channel?.isTextBased()) return;

    const message = await (channel as TextChannel).messages.fetch(
      giveaway.messageId!
    );
    const users = await message.reactions.cache
      .get(this.reaction)
      ?.users.fetch();
    let entries;
    if (!this.botsCanWin) {
      entries = users?.filter((u) => !u.bot).map((u) => u.id) ?? [];
    } else {
      entries = users?.map((u) => u.id) ?? [];
    }

    const winners = this.pickWinners(entries, giveaway.winnerCount);
    const mention = winners.length
      ? winners.map((id) => `<@${id}>`).join(", ")
      : t("no_winners");

    const endEmbed = new EmbedBuilder()
      .setTitle(`🎉 ${t("giveaway_ended")} - ${giveaway.prize}`)
      .setDescription(
        `${t("winners")}: ${mention}\n${t("ended")} <t:${Math.floor(
          giveaway.endAt / 1000
        )}:R>`
      )
      .setColor("DarkRed");

    await message.edit({ embeds: [endEmbed] });

    giveaway.ended = true;
    this.clearTimeoutForGiveaway(giveawayId);
    if (!rerolled) {
      this.events.emit("giveawayEnded", giveaway, winners);
    } else {
      this.events.emit("giveawayRerolled", giveaway, winners);
    }
    await this.adapter.save(giveaway);
  }

  /**
   * Edits an existing giveaway's details.
   *
   * This method allows you to modify the prize, winner count, and requirements of an active giveaway.
   * The giveaway message embed will be updated to reflect the changes, and the updated data will be
   * saved to storage.
   *
   * @param giveawayId - The unique identifier of the giveaway to edit
   * @param options - The new giveaway options (prize, winnerCount, requirements)
   * @param options.channelId - Must match the original channel ID (cannot be changed)
   * @param options.prize - The new prize description
   * @param options.winnerCount - The new number of winners
   * @param options.duration - Not used in editing (original end time is preserved)
   * @param options.requirements - The new entry requirements
   *
   * @returns A Promise that resolves when the giveaway has been updated
   *
   * @throws {Error} When the giveaway is not found or has already ended
   *
   * @example
   * ```typescript
   * // Edit a giveaway to change the prize and add requirements
   * await giveawayManager.edit('abc123def', {
   *   channelId: '123456789', // Must match original
   *   prize: 'Discord Nitro + $50 Gift Card', // Updated prize
   *   winnerCount: 3, // Increased winner count
   *   duration: 0, // Not used in editing
   *   requirements: {
   *     requiredRoles: ['987654321', '876543210'] // Added requirements
   *   }
   * });
   * ```
   */
  public async edit(
    giveawayId: string,
    options: GiveawayOptions
  ): Promise<void> {
    const giveaway = await this.adapter.get(giveawayId);
    if (!giveaway || giveaway.ended) {
      throw new Error("No giveaway found or already ended!");
    }

    const channel = await this.client.channels.fetch(giveaway.channelId);
    if (!channel || !channel.isTextBased()) return;

    const message = await (channel as TextChannel).messages.fetch(
      giveaway.messageId!
    );

    const embed = this.buildEmbed(options, giveaway);

    await message.edit({ embeds: [embed] });

    await this.adapter.edit(giveawayId, {
      giveawayId: giveaway.giveawayId,
      channelId: giveaway.channelId,
      messageId: giveaway.messageId,
      prize: options.prize,
      winnerCount: options.winnerCount,
      endAt: giveaway.endAt,
      ended: false,
      requirements: options.requirements,
    });
    this.events.emit("giveawayEdited", giveaway, {
      giveawayId: giveaway.giveawayId,
      channelId: giveaway.channelId,
      messageId: giveaway.messageId,
      prize: options.prize,
      winnerCount: options.winnerCount,
      endAt: giveaway.endAt,
      ended: false,
      requirements: options.requirements,
    });
  }

  /**
   * Restores timeouts and reaction collectors for all active giveaways.
   *
   * This method is essential for maintaining giveaway functionality after bot restarts.
   * It retrieves all active giveaways from storage and re-establishes their timeouts
   * and reaction collectors. This method is automatically called during construction.
   *
   * @returns A Promise that resolves when all timeouts have been restored
   *
   * @example
   * ```typescript
   * // Usually called automatically, but can be called manually if needed
   * await giveawayManager.restoreTimeouts();
   * ```
   *
   * @internal This method is called automatically during manager initialization
   */
  public async restoreTimeouts() {
    const giveaways = await this.adapter.getAll();
    for (const giveaway of giveaways) {
      if (!giveaway.ended) {
        this.setTimeoutForGiveaway(giveaway);
        this.setReactionCollector(giveaway);
      }
    }
  }

  /**
   * Rerolls the winners of an active giveaway.
   *
   * This method allows you to select new winners for a giveaway without ending it permanently.
   * It performs the same winner selection process as the end method but emits a 'giveawayRerolled'
   * event instead of 'giveawayEnded'.
   *
   * @param giveawayId - The unique identifier of the giveaway to reroll
   *
   * @returns A Promise that resolves when the reroll has been completed
   *
   * @example
   * ```typescript
   * // Reroll winners for a giveaway
   * await giveawayManager.reroll('abc123def');
   *
   * // Listen for the reroll event
   * giveawayManager.events.on('giveawayRerolled', (giveaway, newWinners) => {
   *   console.log(`New winners selected: ${newWinners.join(', ')}`);
   * });
   * ```
   */
  public async reroll(giveawayId: string): Promise<void> {
    const giveaway = await this.adapter.get(giveawayId);
    if (!giveaway || giveaway.ended) return;
    return this.end(giveawayId, true);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  private pickWinners(entries: string[], count: number): string[] {
    const shuffled = entries.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private setTimeoutForGiveaway(giveaway: GiveawayData) {
    const msUntilEnd = giveaway.endAt - Date.now();
    if (msUntilEnd <= 0) {
      this.end(giveaway.giveawayId, false);
      return;
    }

    const timeout = setTimeout(() => {
      this.end(giveaway.giveawayId, false);
    }, msUntilEnd);

    this.timeouts.set(giveaway.giveawayId, timeout);
  }

  private clearTimeoutForGiveaway(giveawayId: string) {
    const timeout = this.timeouts.get(giveawayId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(giveawayId);
    }

    // Also cleanup collector
    const collector = this.collectors.get(giveawayId);
    if (collector) {
      collector.stop();
      this.collectors.delete(giveawayId);
    }
  }

  private async setReactionCollector(giveaway: GiveawayData) {
    const channel = await this.client.channels.fetch(giveaway.channelId);
    if (!channel || !channel.isTextBased()) {
      throw new Error("Channel not found or not text-based");
    }
    const message = await (channel as TextChannel).messages.fetch(
      giveaway.messageId!
    );

    const collectorFilter = (r: MessageReaction, user: User) => {
      return r.emoji.name === this.reaction && user.id !== message.author.id;
    };
    const collector = message.createReactionCollector({
      filter: collectorFilter,
    });
    this.collectors.set(giveaway.giveawayId, collector); // Store for cleanup

    collector.on("collect", async (reaction, user) => {
      this.events.emit("reactionAdded", giveaway, reaction, user);
      const member = await message.guild.members.cache.get(user.id);
      const { passed, reason } = await checkRequirements(
        user,
        member!,
        giveaway.requirements
      );
      if (!passed) {
        try {
          await reaction.users.remove(user);
        } catch {}

        const errEmbed = new EmbedBuilder()
          .setTitle(`${user.username} ${t("cant_join")}`)
          .setDescription(reason!)
          .setColor("Red");

        if (reason) {
          const errMsg = await (reaction.message.channel as TextChannel).send({
            embeds: [errEmbed],
          });
          this.events.emit("requirementsFailed", giveaway, user, reason);

          setTimeout(() => {
            errMsg.delete().catch(() => {});
          }, 5000);
        }

        return;
      } else {
        this.events.emit("requirementsPassed", giveaway, user);
      }
    });
  }
}

export default GiveawayManager;
