
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
}

export interface GiveawayManagerOptions {
    autoSweep?: boolean;
    sweepIntervalMs?: number;
    reaction: string;
    botsCanWin: boolean;
}