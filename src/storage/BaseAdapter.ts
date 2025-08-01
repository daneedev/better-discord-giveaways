import { GiveawayData } from "../types";

export interface BaseAdapter {
    save(data: GiveawayData) : Promise<void>
    get(id: string) : Promise<GiveawayData | null>
    delete(id: string) : Promise<void>
    getAll(): Promise<GiveawayData[]>
    edit(id: string, data: GiveawayData) : Promise<void>
}