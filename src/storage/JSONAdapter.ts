import { GiveawayData } from "../@types";
import { BaseAdapter } from "./BaseAdapter";
import fs from "fs";

export class JSONAdapter implements BaseAdapter {
  private filePath: string;
  private cache: GiveawayData[] = [];

  constructor(filePath: string = "./giveaways.json") {
    this.filePath = filePath;
  }

  private async load(): Promise<void> {
    try {
      const data = await fs.readFileSync(this.filePath, "utf-8");
      this.cache = JSON.parse(data);
    } catch (err) {
      if ((err as any).code === "ENOENT") {
        this.cache = [];
        await this.saveFile();
      } else {
        throw err;
      }
    }
  }

  private async saveFile(): Promise<void> {
    await fs.writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2));
  }

  public async save(data: GiveawayData): Promise<void> {
    await this.load();
    const index = this.cache.findIndex((g) => g.giveawayId === data.giveawayId);
    if (index !== -1) {
      this.cache[index] = data;
    } else {
      this.cache.push(data);
    }
    await this.saveFile();
  }

  public async get(id: string): Promise<GiveawayData | null> {
    await this.load();
    return this.cache.find((g) => g.giveawayId === id) ?? null;
  }

  public async delete(id: string): Promise<void> {
    await this.load();
    this.cache = this.cache.filter((g) => g.giveawayId !== id);
    await this.saveFile();
  }

  public async getAll(): Promise<GiveawayData[]> {
    await this.load();
    return [...this.cache];
  }

  public async edit(id: string, data: GiveawayData): Promise<void> {
    await this.load();
    await this.delete(id);
    await this.save(data);
  }
}
