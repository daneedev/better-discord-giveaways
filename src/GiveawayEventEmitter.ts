import EventEmitter from "events";
import TypedEmitter from "typed-emitter";
import { GiveawayEvents } from "./@types";

/**
 * Typed event emitter for giveaway-related events.
 * 
 * This class extends the standard EventEmitter with TypeScript typing for giveaway events,
 * providing type safety and IntelliSense support when listening to or emitting events.
 * 
 * @example
 * ```typescript
 * const emitter = new GiveawayEventEmitter();
 * 
 * // Type-safe event listening
 * emitter.on('giveawayStarted', (giveaway) => {
 *   // giveaway parameter is automatically typed as GiveawayData
 *   console.log(`Started: ${giveaway.prize}`);
 * });
 * ```
 */
export class GiveawayEventEmitter extends (EventEmitter as new () => TypedEmitter<GiveawayEvents>) {}
