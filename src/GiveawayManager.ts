import { Client, EmbedBuilder, Message, MessageFlags, MessageReaction, TextChannel, User } from "discord.js"
import { GiveawayData, GiveawayManagerOptions, GiveawayOptions } from "./types";
import { BaseAdapter } from "./storage/BaseAdapter";
import { GiveawayEventEmitter } from "./GiveawayEventEmitter";
import { checkRequirements } from "./RequirementCheck";

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
    
    private buildEmbed(options: GiveawayOptions, giveaway: GiveawayData) : EmbedBuilder {
        const lines : string[] = [
            `React with ${this.reaction} to enter!`,
            `Ends <t:${Math.floor(giveaway.endAt / 1000)}:R>`
        ]

        if (options.requirements) {
            const req = options.requirements
            lines.push(`\n**Requirements:**`)

            if (req.requiredRoles?.length) {
                lines.push(`• Must have role(s): <@&${req.requiredRoles.join(">, <@&")}>`)
            }

            if (req.accountAgeMin) {
                lines.push(`• Account must be created at least <t:${Math.floor(req.accountAgeMin / 1000)}:R>`)
            }

            if (req.joinedServerBefore) {
                lines.push(`• User must joined this server before <t:${Math.floor(req.joinedServerBefore / 1000)}:D>`)
            }
        }

        const embed = new EmbedBuilder()
            .setTitle(`🎉 Giveaway - ${options.prize}`)
            .setDescription(lines.join("\n"))
            .setColor("Red")

        return embed;
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
            ended: false,
            requirements: options.requirements
        }

        const channel = await this.client.channels.fetch(options.channelId)
        if (!channel || !channel.isTextBased()) {
            throw new Error("Channel not found or not text-based")
        }

        const embed = this.buildEmbed(options, giveaway)

        const message = await (channel as TextChannel).send({ embeds: [embed]})
        await message.react(this.reaction)
    
        giveaway.messageId = message.id
        await this.adapter.save(giveaway)

        this.setTimeoutForGiveaway(giveaway)
        this.events.emit("giveawayStarted", giveaway);

        this.setReactionCollector(giveaway)

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

        const embed = this.buildEmbed(options, giveaway)

        await message.edit({ embeds: [embed]})

        await this.adapter.edit(giveawayId, {
            giveawayId: giveaway.giveawayId,
            channelId: giveaway.channelId,
            messageId: giveaway.messageId,
            prize: options.prize,
            winnerCount: options.winnerCount,
            endAt: giveaway.endAt,
            ended: false,
            requirements: options.requirements
        })
        this.events.emit("giveawayEdited", giveaway, {
            giveawayId: giveaway.giveawayId,
            channelId: giveaway.channelId,
            messageId: giveaway.messageId,
            prize: options.prize,
            winnerCount: options.winnerCount,
            endAt: giveaway.endAt,
            ended: false,
            requirements: options.requirements
        })
    }

    public async restoreTimeouts() {
        const giveaways = await this.adapter.getAll()
        for (const giveaway of giveaways) {
            if (!giveaway.ended) {
                this.setTimeoutForGiveaway(giveaway)
                this.setReactionCollector(giveaway)
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

    private async setReactionCollector(giveaway: GiveawayData) {
        const channel = await this.client.channels.fetch(giveaway.channelId)
        if (!channel || !channel.isTextBased()) {
            throw new Error("Channel not found or not text-based")
        }
        const message = await (channel as TextChannel).messages.fetch(giveaway.messageId!)

        const collectorFilter = (r: MessageReaction, user: User) => {
            return r.emoji.name === this.reaction && user.id !== message.author.id
        }
        const collector = message.createReactionCollector({filter: collectorFilter})

        collector.on("collect", async (reaction, user) => {
            const member = await message.guild.members.cache.get(user.id)
            const { passed, reason } = await checkRequirements(user, member!, giveaway.requirements)
            if (!passed) {
                try {
                    await reaction.users.remove(user)
                } catch {}

                const errEmbed = new EmbedBuilder()
                    .setTitle(`${user.username} can't join giveaway`)
                    .setDescription(reason!)
                    .setColor("Red")
                
               if (reason) {
                 const errMsg = await (reaction.message.channel as TextChannel).send({embeds: [errEmbed]})

                 setTimeout(() => {
                    errMsg.delete().catch(() => {})
                 }, 5000)
               }

                return
            }
        })
    }
}

export default GiveawayManager;