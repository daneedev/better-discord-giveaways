import { BaseAdapter } from "./BaseAdapter";
import { GiveawayData } from "../types";
import { GiveawayModel, initGiveawayModel } from "../models/GiveawayModel";
import { Sequelize, ModelStatic } from "sequelize"

export class SequelizeAdapter implements BaseAdapter {
    private model: ModelStatic<GiveawayModel>

    constructor(sequelize: Sequelize) {
        this.model = initGiveawayModel(sequelize)
    }

    async save(data: GiveawayData): Promise<void> {
        await this.model.upsert({ 
            giveawayId: data.giveawayId,
            messageId: data.messageId,
            channelId: data.channelId,
            prize: data.prize,
            winnerCount: data.winnerCount,
            endAt: data.endAt,
            ended: data.ended
        })
    }

    async get(id: string): Promise<GiveawayData | null> {
        const record = await this.model.findByPk(id)
        if (!record) return null
        return record
    }

    async getAll(): Promise<GiveawayData[]> {
        const records = await this.model.findAll()
        return records
    }

    async delete(id: string): Promise<void> {
        await this.model.destroy({ where: {giveawayId: id}})
    }
 }