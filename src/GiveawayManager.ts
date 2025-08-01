import { Client, EmbedBuilder, TextChannel } from "discord.js"
import { GiveawayData, GiveawayManagerOptions, GiveawayOptions } from "./types";
import { BaseAdapter } from "./storage/BaseAdapter";
import { GiveawayEventEmitter } from "./GiveawayEventEmitter";

class GiveawayManager  {
    private client: Client;
    private reaction: string;
    private botsCanWin: boolean;
    private adapter: BaseAdapter;
    private timeouts: Map<string, NodeJS.Timeout> = new Map()
    public readonly events: GiveawayEventEmitter
    
    constructor(client: Client, adapter: BaseAdapter, options: GiveawayManagerOptions) {
        this.client = client;
        this.adapter = adapter;
        this.reaction = options.reaction;
        this.botsCanWin = options.botsCanWin;
        this.events = new GiveawayEventEmitter();

        this.restoreTimeouts()
    }
    
    public async start(options: GiveawayOptions) : Promise<GiveawayData> {
        const endAt = Date.now() + options.duration
        const giveaway: GiveawayData = {
            giveawayId: this.generateId(),
            channelId: options.channelId,
            prize: options.prize,
            winnerCount: options.winnerCount,
            endAt,
            messageId: null,
            ended: false
        }

        const channel = await this.client.channels.fetch(options.channelId)
        if (!channel || !channel.isTextBased()) {
            throw new Error("Channel not found or not text-based")
        }

        const embed = new EmbedBuilder()
            .setTitle(`🎉 Giveaway - ${options.prize}`)
            .setDescription(`React with ${this.reaction} to enter!\nEnds <t:${Math.floor(endAt / 1000)}:R>`)
            .setColor("Red")

        const message = await (channel as TextChannel).send({ embeds: [embed]})
        await message.react(this.reaction)
    
        giveaway.messageId = message.id
        await this.adapter.save(giveaway)

        this.setTimeoutForGiveaway(giveaway)
        this.events.emit("giveawayStarted", giveaway);
        return giveaway;
    }

    public async end(giveawayId: string, rerolled: boolean) : Promise<void> {
        const giveaway = await this.adapter.get(giveawayId)
        if (!giveaway || giveaway.ended) return

        const channel = await this.client.channels.fetch(giveaway.channelId)
        if (!channel?.isTextBased()) return

        const message = await (channel as TextChannel).messages.fetch(giveaway.messageId!)
        const users = await message.reactions.cache.get(this.reaction)?.users.fetch()
        let entries;
        if (!this.botsCanWin) {
            entries = users?.filter(u => !u.bot).map(u => u.id) ?? []
        } else {
            entries = users?.map(u => u.id) ?? []
        }

        const winners = this.pickWinners(entries, giveaway.winnerCount)
        const mention = winners.length ? winners.map(id => `<@${id}>`).join(", ") : "No winners"

        const endEmbed = new EmbedBuilder()
            .setTitle(`🎉 Giveaway ended - ${giveaway.prize}`)
            .setDescription(`Winner(s): ${mention}\nEnded <t:${Math.floor(giveaway.endAt / 1000)}:R>`)
            .setColor("DarkRed")

        await message.edit({ embeds: [endEmbed] })

        giveaway.ended = true
        this.clearTimeoutForGiveaway(giveawayId)
        if (!rerolled) {
            this.events.emit("giveawayEnded", giveaway, winners);
        } else {
            this.events.emit("giveawayRerolled", giveaway, winners);
        }
        await this.adapter.save(giveaway)
    }

    public async edit(giveawayId: string, options: GiveawayOptions) : Promise<void> {
        const giveaway = await this.adapter.get(giveawayId)
        if (!giveaway || giveaway.ended) {
            throw new Error("No giveaway found or already ended!")
        }

        const channel = await this.client.channels.fetch(giveaway.channelId)
        if (!channel || !channel.isTextBased()) return


        const message = await (channel as TextChannel).messages.fetch(giveaway.messageId!)
        const embed = new EmbedBuilder()
            .setTitle(`🎉 Giveaway - ${options.prize}`)
            .setDescription(`React with ${this.reaction} to enter!\nEnds <t:${Math.floor(giveaway.endAt / 1000)}:R>`)
            .setColor("Red")

        await message.edit({ embeds: [embed]})

        await this.adapter.edit(giveawayId, {
            giveawayId: giveaway.giveawayId,
            channelId: giveaway.channelId,
            messageId: giveaway.messageId,
            prize: options.prize,
            winnerCount: options.winnerCount,
            endAt: giveaway.endAt,
            ended: false
        })
        this.events.emit("giveawayEdited", giveaway, {
            giveawayId: giveaway.giveawayId,
            channelId: giveaway.channelId,
            messageId: giveaway.messageId,
            prize: options.prize,
            winnerCount: options.winnerCount,
            endAt: giveaway.endAt,
            ended: false
        })
    }

    public async restoreTimeouts() {
        const giveaways = await this.adapter.getAll()
        for (const giveaway of giveaways) {
            if (!giveaway.ended) {
                this.setTimeoutForGiveaway(giveaway)
            }
        }
    }

    public async reroll(giveawayId: string) : Promise<void> {
        const giveaway = await this.adapter.get(giveawayId)
        if (!giveaway || giveaway.ended) return
        return this.end(giveawayId, true)
    }

    private generateId() : string {
        return Math.random().toString(36).substring(2, 10)
    }

    private pickWinners(entries: string[], count: number) : string[] {
        const shuffled = entries.sort(() => 0.5 - Math.random())
        return shuffled.slice(0, count)
    }

    private setTimeoutForGiveaway(giveaway: GiveawayData) {
        const msUntilEnd = giveaway.endAt - Date.now()
        if (msUntilEnd <= 0) {
            this.end(giveaway.giveawayId, false)
            return
        }

        const timeout = setTimeout(() => {
            this.end(giveaway.giveawayId, false)
        }, msUntilEnd)

        this.timeouts.set(giveaway.giveawayId, timeout)
    }

    private clearTimeoutForGiveaway(giveawayId: string) {
        const timeout = this.timeouts.get(giveawayId)
        if (timeout) {
            clearTimeout(timeout)
            this.timeouts.delete(giveawayId)
        }
    }
}

export default GiveawayManager;