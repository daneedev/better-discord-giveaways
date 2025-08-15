import { BaseAdapter } from "./BaseAdapter";
import { GiveawayData } from "../@types";
import { GiveawayModel, initGiveawayModel } from "../models/GiveawayModel";
import { Sequelize, ModelStatic } from "sequelize";

/**
 * Database storage adapter using Sequelize ORM.
 * 
 * This adapter provides persistent storage for giveaway data using any SQL database
 * supported by Sequelize (PostgreSQL, MySQL, MariaDB, SQLite, Microsoft SQL Server).
 * It's ideal for production environments, larger bots, or when you need advanced
 * database features like transactions, relationships, and complex queries.
 * 
 * Features:
 * - Support for multiple database engines
 * - Automatic table creation and schema management
 * - Built-in connection pooling and optimization
 * - Transaction support for data integrity
 * - Scalable for high-volume applications
 * 
 * @example
 * ```typescript
 * import { Sequelize } from 'sequelize';
 * import { SequelizeAdapter } from 'better-giveaways';
 * 
 * // PostgreSQL example
 * const sequelize = new Sequelize('postgresql://user:pass@localhost:5432/giveaways');
 * 
 * // SQLite example (good for development)
 * const sequelize = new Sequelize({
 *   dialect: 'sqlite',
 *   storage: './giveaways.db'
 * });
 * 
 * // MySQL example
 * const sequelize = new Sequelize('mysql://user:pass@localhost:3306/giveaways');
 * 
 * const adapter = new SequelizeAdapter(sequelize);
 * const giveawayManager = new GiveawayManager(client, adapter, options);
 * 
 * // Don't forget to sync the database
 * await sequelize.sync();
 * ```
 */
export class SequelizeAdapter implements BaseAdapter {
  private model: ModelStatic<GiveawayModel>;

  /**
   * Creates a new SequelizeAdapter instance.
   * 
   * The adapter will automatically initialize the GiveawayModel using the provided
   * Sequelize instance. Make sure to call `sequelize.sync()` to create the database
   * tables before using the adapter.
   * 
   * @param sequelize - A configured Sequelize instance connected to your database
   * 
   * @example
   * ```typescript
   * import { Sequelize } from 'sequelize';
   * 
   * const sequelize = new Sequelize({
   *   dialect: 'postgres',
   *   host: 'localhost',
   *   database: 'giveaways',
   *   username: 'user',
   *   password: 'password',
   *   logging: false // Set to console.log to see SQL queries
   * });
   * 
   * const adapter = new SequelizeAdapter(sequelize);
   * 
   * // Create tables if they don't exist
   * await sequelize.sync();
   * ```
   */
  constructor(sequelize: Sequelize) {
    this.model = initGiveawayModel(sequelize);
  }

  /**
   * Saves or updates giveaway data in the database.
   * 
   * Uses Sequelize's upsert operation which will insert a new record if the
   * giveaway doesn't exist, or update the existing record if it does.
   * 
   * @param data - The giveaway data to save
   * @throws {Error} If database operation fails
   */
  public async save(data: GiveawayData): Promise<void> {
    await this.model.upsert({
      giveawayId: data.giveawayId,
      messageId: data.messageId,
      channelId: data.channelId,
      prize: data.prize,
      winnerCount: data.winnerCount,
      endAt: data.endAt,
      ended: data.ended,
      requirements: data.requirements,
    });
  }

  /**
   * Retrieves a specific giveaway by its primary key (giveawayId).
   * 
   * @param id - The unique giveaway ID to retrieve
   * @returns The giveaway data or null if not found
   * @throws {Error} If database operation fails
   */
  public async get(id: string): Promise<GiveawayData | null> {
    const record = await this.model.findByPk(id);
    if (!record) return null;
    return record;
  }

  /**
   * Retrieves all giveaways from the database.
   * 
   * @returns An array of all giveaway data
   * @throws {Error} If database operation fails
   */
  public async getAll(): Promise<GiveawayData[]> {
    const records = await this.model.findAll();
    return records;
  }

  /**
   * Deletes a giveaway from the database.
   * 
   * @param id - The unique giveaway ID to delete
   * @throws {Error} If database operation fails
   */
  public async delete(id: string): Promise<void> {
    await this.model.destroy({ where: { giveawayId: id } });
  }

  /**
   * Updates an existing giveaway with new data.
   * 
   * @param id - The giveaway ID to update
   * @param data - The new giveaway data
   * @throws {Error} If database operation fails
   */
  public async edit(id: string, data: GiveawayData): Promise<void> {
    await this.model.update(data, {
      where: {
        giveawayId: id,
      },
    });
  }
}
