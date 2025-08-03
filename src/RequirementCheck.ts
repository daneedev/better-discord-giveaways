import { GuildMember, User } from "discord.js";
import { GiveawayRequirements } from "./types";
import ms from "ms"

export async function checkRequirements(user: User, member: GuildMember, requirements?: GiveawayRequirements) : Promise<{passed: boolean, reason?: string}> {
        if (!requirements) return {passed: true};

        if (requirements.requiredRoles) {
            const hasRoles = requirements.requiredRoles.every(roleId =>
                member.roles.cache.has(roleId)
            )
            if (!hasRoles) return {
                passed: false,
                reason: `You must have one of the required roles: ${requirements.requiredRoles.map(id => `<@&${id}>`).join(", ")}`
            };
        }

        if (requirements.accountAgeMin) {
            const age = Date.now() - user.createdTimestamp
            if (age < requirements.accountAgeMin) {
                const days = Math.ceil(requirements.accountAgeMin / (1000 * 60 * 60 * 24));
                return {
                    passed: false,
                    reason: `Your account must be at least ${days} day(s) old to enter`
                }
            }
        }

        if (requirements.joinedServerBefore) {
            const joined = member.joinedTimestamp ?? 0
            if (joined > requirements.joinedServerBefore) return {
                passed: false,
                reason: `You have to be member of the server for ${ms(requirements.joinedServerBefore, {long: true})}`
            };
        }

        if (requirements.custom) {
            const custom = await requirements.custom(user.id)
            if (!custom.passed) {
                return {
                    passed: false,
                    reason: custom.reason
                }
            }
        }

        return { passed: true }
    }
