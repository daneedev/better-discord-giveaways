
export interface GiveawayData {
    giveawayId: string;
    messageId: string | null;
    channelId: string;
    prize: string;
    winnerCount: number;
    endAt: number;
    ended: boolean;
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
    accountAgeMin?: number;
    joinedServerBefore?: number;
    custom?: (userId: string) => Promise<boolean>;
}