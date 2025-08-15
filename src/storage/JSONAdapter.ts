import { GiveawayData } from "../@types";
import { BaseAdapter } from "./BaseAdapter";
import fs from "fs";

/**
 * File-based storage adapter using JSON format.
 * 
 * This adapter provides persistent storage for giveaway data using a local JSON file.
 * It's ideal for simple deployments, development environments, or small bots where
 * database setup might be overkill.
 * 
 * Features:
 * - Automatic file creation if it doesn't exist
 * - In-memory caching for better performance
 * - Atomic write operations to prevent data corruption
 * - Human-readable JSON format for easy debugging
 * 
 * @example
 * ```typescript
 * import { JSONAdapter } from 'better-giveaways';
 * 
 * // Use default file location (./giveaways.json)
 * const adapter = new JSONAdapter();
 * 
 * // Or specify a custom file path
 * const adapter = new JSONAdapter('./data/my-giveaways.json');
 * 
 * // Use with GiveawayManager
 * const giveawayManager = new GiveawayManager(client, adapter, options);
 * ```
 */
export class JSONAdapter implements BaseAdapter {
  private filePath: string;
  private cache: GiveawayData[] = [];

  /**
   * Creates a new JSONAdapter instance.
   * 
   * @param filePath - The path to the JSON file for storing giveaway data.
   *                   Defaults to './giveaways.json' in the current working directory.
   *                   The file will be created automatically if it doesn't exist.
   * 
   * @example
   * ```typescript
   * // Use default location
   * const adapter = new JSONAdapter();
   * 
   * // Use custom location
   * const adapter = new JSONAdapter('./data/giveaways.json');
   * 
   * // Use absolute path
   * const adapter = new JSONAdapter('/var/lib/bot/giveaways.json');
   * ```
   */
  constructor(filePath: string = "./giveaways.json") {
    this.filePath = filePath;
  }

  /**
   * Loads giveaway data from the JSON file into memory cache.
   * 
   * This method handles file creation if the file doesn't exist and provides
   * error handling for corrupted or inaccessible files.
   * 
   * @private
   * @throws {Error} If the file exists but cannot be read or parsed
   */
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

  /**
   * Writes the current cache to the JSON file.
   * 
   * The data is written with pretty formatting (2-space indentation) for
   * better readability when inspecting the file manually.
   * 
   * @private
   * @throws {Error} If the file cannot be written (permissions, disk space, etc.)
   */
  private async saveFile(): Promise<void> {
    await fs.writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2));
  }

  /**
   * Saves or updates giveaway data.
   * 
   * If a giveaway with the same ID already exists, it will be updated.
   * Otherwise, a new giveaway will be added to the storage.
   * 
   * @param data - The giveaway data to save
   * @throws {Error} If the file cannot be written
   */
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

  /**
   * Retrieves a specific giveaway by ID.
   * 
   * @param id - The unique giveaway ID to retrieve
   * @returns The giveaway data or null if not found
   * @throws {Error} If the file cannot be read
   */
  public async get(id: string): Promise<GiveawayData | null> {
    await this.load();
    return this.cache.find((g) => g.giveawayId === id) ?? null;
  }

  /**
   * Deletes a giveaway from storage.
   * 
   * @param id - The unique giveaway ID to delete
   * @throws {Error} If the file cannot be written
   */
  public async delete(id: string): Promise<void> {
    await this.load();
    this.cache = this.cache.filter((g) => g.giveawayId !== id);
    await this.saveFile();
  }

  /**
   * Retrieves all giveaways from storage.
   * 
   * @returns A copy of all giveaway data (to prevent external modification of cache)
   * @throws {Error} If the file cannot be read
   */
  public async getAll(): Promise<GiveawayData[]> {
    await this.load();
    return [...this.cache];
  }

  /**
   * Updates an existing giveaway with new data.
   * 
   * This implementation deletes the old giveaway and saves the new data,
   * ensuring the giveaway ID can be changed if needed.
   * 
   * @param id - The current giveaway ID to update
   * @param data - The new giveaway data
   * @throws {Error} If the file cannot be written
   */
  public async edit(id: string, data: GiveawayData): Promise<void> {
    await this.load();
    await this.delete(id);
    await this.save(data);
  }
}
