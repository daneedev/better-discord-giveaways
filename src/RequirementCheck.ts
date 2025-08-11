import { GuildMember, User } from "discord.js";
import { GiveawayRequirements } from "./@types";
import { t } from "./i18n";

export async function checkRequirements(
  user: User,
  member: GuildMember,
  requirements?: GiveawayRequirements
): Promise<{ passed: boolean; reason?: string }> {
  if (!requirements) return { passed: true };

  if (requirements.requiredRoles) {
    const hasRoles = requirements.requiredRoles.every((roleId) =>
      member.roles.cache.has(roleId)
    );
    if (!hasRoles)
      return {
        passed: false,
        reason: `${t("you_role")}: ${requirements.requiredRoles
          .map((id) => `<@&${id}>`)
          .join(", ")}`,
      };
  }

  if (requirements.accountAgeMin) {
    if (user.createdTimestamp > requirements.accountAgeMin) {
      return {
        passed: false,
        reason: `${t("you_account")} <t:${Math.floor(
          requirements.accountAgeMin / 1000
        )}:R>`,
      };
    }
  }

  if (requirements.joinedServerBefore) {
    if (
      member.joinedTimestamp === null ||
      member.joinedTimestamp > requirements.joinedServerBefore
    )
      return {
        passed: false,
        reason: `${t("you_member")} <t:${Math.floor(
          requirements.joinedServerBefore / 1000
        )}:D>`,
      };
  }

  if (requirements.custom) {
    const custom = await requirements.custom(user.id);
    if (!custom.passed) {
      return {
        passed: false,
        reason: custom.reason,
      };
    }
  }

  return { passed: true };
}
