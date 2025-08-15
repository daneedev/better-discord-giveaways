import { GiveawayData } from "../@types";

/**
 * Base interface for giveaway storage adapters.
 * 
 * This interface defines the contract that all storage adapters must implement
 * to provide persistent storage for giveaway data. Adapters can use any storage
 * backend (JSON files, databases, cloud storage, etc.) as long as they implement
 * these methods.
 * 
 * The interface supports full CRUD operations (Create, Read, Update, Delete) for
 * giveaway data, allowing the GiveawayManager to work with different storage solutions
 * without code changes.
 * 
 * @example
 * ```typescript
 * // Custom Redis adapter implementation
 * class RedisAdapter implements BaseAdapter {
 *   private redis: Redis;
 * 
 *   constructor(redisClient: Redis) {
 *     this.redis = redisClient;
 *   }
 * 
 *   async save(data: GiveawayData): Promise<void> {
 *     await this.redis.set(`giveaway:${data.giveawayId}`, JSON.stringify(data));
 *   }
 * 
 *   async get(id: string): Promise<GiveawayData | null> {
 *     const data = await this.redis.get(`giveaway:${id}`);
 *     return data ? JSON.parse(data) : null;
 *   }
 * 
 *   // ... implement other methods
 * }
 * ```
 */
export interface BaseAdapter {
  /**
   * Saves or updates giveaway data in storage.
   * 
   * If a giveaway with the same ID already exists, it should be updated.
   * If it doesn't exist, a new record should be created.
   * 
   * @param data - The complete giveaway data to save
   * @returns A Promise that resolves when the data has been saved
   * 
   * @example
   * ```typescript
   * await adapter.save({
   *   giveawayId: 'abc123',
   *   messageId: '987654321',
   *   channelId: '123456789',
   *   prize: 'Discord Nitro',
   *   winnerCount: 1,
   *   endAt: Date.now() + 86400000,
   *   ended: false
   * });
   * ```
   */
  save(data: GiveawayData): Promise<void>;

  /**
   * Retrieves a specific giveaway by its ID.
   * 
   * @param id - The unique giveaway ID to retrieve
   * @returns A Promise that resolves to the giveaway data or null if not found
   * 
   * @example
   * ```typescript
   * const giveaway = await adapter.get('abc123');
   * if (giveaway) {
   *   console.log(`Found giveaway: ${giveaway.prize}`);
   * } else {
   *   console.log('Giveaway not found');
   * }
   * ```
   */
  get(id: string): Promise<GiveawayData | null>;

  /**
   * Deletes a giveaway from storage.
   * 
   * @param id - The unique giveaway ID to delete
   * @returns A Promise that resolves when the giveaway has been deleted
   * 
   * @example
   * ```typescript
   * await adapter.delete('abc123');
   * console.log('Giveaway deleted successfully');
   * ```
   */
  delete(id: string): Promise<void>;

  /**
   * Retrieves all giveaways from storage.
   * 
   * This method is used during manager initialization to restore timeouts
   * for active giveaways after a bot restart.
   * 
   * @returns A Promise that resolves to an array of all giveaway data
   * 
   * @example
   * ```typescript
   * const allGiveaways = await adapter.getAll();
   * const activeGiveaways = allGiveaways.filter(g => !g.ended);
   * console.log(`Found ${activeGiveaways.length} active giveaways`);
   * ```
   */
  getAll(): Promise<GiveawayData[]>;

  /**
   * Updates an existing giveaway with new data.
   * 
   * This method is used when editing giveaway details such as prize,
   * winner count, or requirements.
   * 
   * @param id - The unique giveaway ID to update
   * @param data - The new giveaway data to save
   * @returns A Promise that resolves when the update is complete
   * 
   * @example
   * ```typescript
   * await adapter.edit('abc123', {
   *   ...existingGiveaway,
   *   prize: 'Updated Prize Name',
   *   winnerCount: 3
   * });
   * ```
   */
  edit(id: string, data: GiveawayData): Promise<void>;
}
