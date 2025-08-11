import EventEmitter from "events";
import TypedEmitter from "typed-emitter";
import { GiveawayEvents } from "./@types";

export class GiveawayEventEmitter extends (EventEmitter as new () => TypedEmitter<GiveawayEvents>) {}
