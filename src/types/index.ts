
export interface GiveawayData {
    giveawayId: string;
    messageId: string | null;
    channelId: string;
    prize: string;
    winnerCount: number;
    endAt: number;
    ended: boolean;
    requirements?: GiveawayRequirements;
}

export interface GiveawayOptions {
    channelId: string;
    prize: string;
    winnerCount: number;
    duration: number;
    requirements?: GiveawayRequirements;
}

export interface GiveawayManagerOptions {
    reaction: string;
    botsCanWin: boolean;
}

export type GiveawayEvents = {
    giveawayStarted: (giveaway: GiveawayData) => void;
    giveawayEnded: (giveaway: GiveawayData, winners: string[]) => void;
    giveawayRerolled: (giveaway: GiveawayData, winners: string[]) => void;
    giveawayEdited: (giveaway: GiveawayData, updated: GiveawayData) => void;
}

export interface GiveawayRequirements {
    requiredRoles?: string[];
    accountAgeMin?: number; // UNIX Timestamp (Minimal user created timestamp)
    joinedServerBefore?: number; // UNIX Timestamp (Before)
    custom?: (userId: string) => Promise<{passed: boolean, reason: string}>;
}