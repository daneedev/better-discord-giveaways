import { MessageReaction, User } from "discord.js";

/**
 * Represents the complete data structure of a giveaway.
 * 
 * This interface contains all the information needed to track and manage a giveaway,
 * including its current state, configuration, and Discord-related identifiers.
 * 
 * @example
 * ```typescript
 * const giveawayData: GiveawayData = {
 *   giveawayId: 'abc123def',
 *   messageId: '987654321',
 *   channelId: '123456789',
 *   prize: 'Discord Nitro',
 *   winnerCount: 2,
 *   endAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
 *   ended: false,
 *   requirements: {
 *     requiredRoles: ['987654321'],
 *     accountAgeMin: Date.now() - (30 * 24 * 60 * 60 * 1000) // 30 days old
 *   }
 * };
 * ```
 */
export interface GiveawayData {
  /** Unique identifier for the giveaway, generated automatically */
  giveawayId: string;
  /** Discord message ID of the giveaway embed, null until message is sent */
  messageId: string | null;
  /** Discord channel ID where the giveaway is hosted */
  channelId: string;
  /** Description of the prize being given away */
  prize: string;
  /** Number of winners to be selected */
  winnerCount: number;
  /** UNIX timestamp when the giveaway should end */
  endAt: number;
  /** Whether the giveaway has been concluded */
  ended: boolean;
  /** Optional entry requirements for participants */
  requirements?: GiveawayRequirements;
}

/**
 * Configuration options for creating a new giveaway.
 * 
 * This interface defines all the parameters needed to start a giveaway,
 * including duration, prize details, and entry requirements.
 * 
 * @example
 * ```typescript
 * const giveawayOptions: GiveawayOptions = {
 *   channelId: '123456789',
 *   prize: '$50 Steam Gift Card',
 *   winnerCount: 3,
 *   duration: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
 *   requirements: {
 *     requiredRoles: ['VIP', 'Regular'],
 *     accountAgeMin: Date.now() - (14 * 24 * 60 * 60 * 1000), // 2 weeks old
 *     joinedServerBefore: Date.now() - (7 * 24 * 60 * 60 * 1000) // Joined 1 week ago
 *   }
 * };
 * ```
 */
export interface GiveawayOptions {
  /** Discord channel ID where the giveaway will be posted */
  channelId: string;
  /** Description of the prize being offered */
  prize: string;
  /** Number of winners to select when the giveaway ends */
  winnerCount: number;
  /** Duration of the giveaway in milliseconds */
  duration: number;
  /** Optional entry requirements that participants must meet */
  requirements?: GiveawayRequirements;
}

/**
 * Configuration options for the GiveawayManager instance.
 * 
 * These options control the global behavior of the giveaway manager,
 * including reaction emoji, bot participation, and localization.
 * 
 * @example
 * ```typescript
 * const managerOptions: GiveawayManagerOptions = {
 *   reaction: '🎉',        // Use party emoji for entries
 *   botsCanWin: false,     // Exclude bots from winning
 *   language: 'en'         // Use English language
 * };
 * ```
 */
export interface GiveawayManagerOptions {
  /** The emoji reaction that users will use to enter giveaways */
  reaction: string;
  /** Whether bot accounts are allowed to participate and win giveaways */
  botsCanWin: boolean;
  /** Language for giveaway messages and UI text */
  language?: "en" | "cs";
}

/**
 * Type definition for all giveaway-related events.
 * 
 * This type provides strong typing for the event emitter, ensuring type safety
 * when listening to or emitting giveaway events. Each event includes relevant
 * data about the giveaway and any related objects.
 * 
 * @example
 * ```typescript
 * // Type-safe event handling
 * giveawayManager.events.on('giveawayStarted', (giveaway: GiveawayData) => {
 *   console.log(`New giveaway: ${giveaway.prize}`);
 * });
 * 
 * giveawayManager.events.on('giveawayEnded', (giveaway: GiveawayData, winners: string[]) => {
 *   console.log(`Giveaway ended with ${winners.length} winners`);
 * });
 * ```
 */
export type GiveawayEvents = {
  /** Fired when a new giveaway is successfully started */
  giveawayStarted: (giveaway: GiveawayData) => void;
  /** Fired when a giveaway naturally ends and winners are selected */
  giveawayEnded: (giveaway: GiveawayData, winners: string[]) => void;
  /** Fired when a giveaway is rerolled and new winners are selected */
  giveawayRerolled: (giveaway: GiveawayData, winners: string[]) => void;
  /** Fired when a giveaway's details are updated */
  giveawayEdited: (giveaway: GiveawayData, updated: GiveawayData) => void;
  /** Fired when someone adds a reaction to a giveaway message */
  reactionAdded: (
    giveaway: GiveawayData,
    reaction: MessageReaction,
    user: User
  ) => void;
  /** Fired when a user fails to meet entry requirements */
  requirementsFailed: (
    giveaway: GiveawayData,
    user: User,
    reason: string
  ) => void;
  /** Fired when a user successfully meets all entry requirements */
  requirementsPassed: (giveaway: GiveawayData, user: User) => void;
};

/**
 * Defines entry requirements that participants must meet to enter a giveaway.
 * 
 * This interface allows for flexible requirement configuration, from simple
 * role checks to complex custom validation functions. All requirements are
 * optional and can be combined as needed.
 * 
 * @example
 * ```typescript
 * const requirements: GiveawayRequirements = {
 *   // Must have at least one of these roles
 *   requiredRoles: ['123456789', '987654321'],
 *   
 *   // Account must be at least 30 days old
 *   accountAgeMin: Date.now() - (30 * 24 * 60 * 60 * 1000),
 *   
 *   // Must have joined server before this date
 *   joinedServerBefore: Date.now() - (7 * 24 * 60 * 60 * 1000),
 *   
 *   // Custom validation function
 *   custom: async (userId: string) => {
 *     const user = await getUserFromDatabase(userId);
 *     if (user.reputation < 100) {
 *       return { passed: false, reason: 'Reputation too low (minimum 100)' };
 *     }
 *     return { passed: true, reason: '' };
 *   }
 * };
 * ```
 */
export interface GiveawayRequirements {
  /** Array of Discord role IDs that the user must have at least one of */
  requiredRoles?: string[];
  /** UNIX timestamp - user's account must be created before this time */
  accountAgeMin?: number;
  /** UNIX timestamp - user must have joined the server before this time */
  joinedServerBefore?: number;
  /** Custom validation function for complex requirements */
  custom?: (userId: string) => Promise<{ passed: boolean; reason: string }>;
}
