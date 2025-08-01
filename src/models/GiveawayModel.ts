import { Sequelize, DataTypes, Model } from "sequelize"
import { GiveawayData } from "../types"

export class GiveawayModel extends Model implements GiveawayData {
    declare giveawayId: string;
    declare messageId: string | null;
    declare channelId: string;
    declare prize: string;
    declare winnerCount: number;
    declare endAt: number;
    declare ended: boolean;
}

export function initGiveawayModel(sequelize: Sequelize) {
    GiveawayModel.init({
        giveawayId: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true
        },
        messageId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        channelId: {
            type: DataTypes.STRING,
            allowNull: false
        },
        prize: {
            type: DataTypes.STRING,
            allowNull: false
        },
        winnerCount: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        endAt: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        ended: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: "Giveaway",
        tableName: "giveaways",
        timestamps: false
    })

    return GiveawayModel;
}