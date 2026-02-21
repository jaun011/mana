const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ quiet: true });

function parseUserIds(rawIds) {
  if (!rawIds) {
    return [];
  }

  return rawIds
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const config = {
  discordToken: process.env.DISCORD_TOKEN ?? "",
  discordClientId: process.env.DISCORD_CLIENT_ID ?? "",
  discordGuildId: process.env.DISCORD_GUILD_ID ?? "",
  adminUserIds: parseUserIds(process.env.ADMIN_USER_IDS ?? ""),
  logLevel: process.env.LOG_LEVEL ?? "info",
  assetsDir: path.resolve(process.cwd(), process.env.ASSETS_DIR ?? path.join("assets", "emojis")),
  syncApplicationEmojisOnStart:
    String(process.env.SYNC_APP_EMOJIS_ON_START ?? "true").toLowerCase() === "true",
  settingsPath: path.resolve(process.cwd(), "data", "settings.json"),
  errorLogPath: path.resolve(process.cwd(), "data", "error.log")
};

function validateRuntimeConfig() {
  if (!config.discordToken) {
    throw new Error("Variavel DISCORD_TOKEN nao configurada no .env.");
  }
}

module.exports = {
  config,
  validateRuntimeConfig
};
