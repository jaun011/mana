const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { config, validateRuntimeConfig } = require("./config/appConfig");
const { createLogger } = require("./utils/logger");
const { SettingsStore } = require("./storage/settingsStore");
const { createCommands } = require("./discord/commands");
const { createInteractionRouter } = require("./discord/interactionRouter");
const { registerCommands } = require("./bootstrap/registerCommands");
const { syncApplicationEmojis } = require("./services/applicationEmojiService");
const { setEmojiMap } = require("./services/emojiRegistry");
const { assertCreditsIntegrity, logCreditsBanner } = require("./security/creditsGuard");
const { verifyRuntimeArmor, startArmorWatch } = require("./security/runtimeArmor");

const logger = createLogger({
  level: config.logLevel,
  errorLogPath: config.errorLogPath
});

async function bootstrap() {
  validateRuntimeConfig();
  verifyRuntimeArmor();
  startArmorWatch({
    logger
  });
  assertCreditsIntegrity();
  logCreditsBanner(logger);

  const settingsStore = new SettingsStore(config.settingsPath, {
    discordGuildId: config.discordGuildId,
    discordClientId: config.discordClientId,
    adminUserIds: config.adminUserIds
  });
  await settingsStore.init();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  const commands = createCommands({
    settingsStore,
    logger
  });

  const commandMap = new Collection(commands.map((command) => [command.data.name, command]));
  const interactionRouter = createInteractionRouter({
    commandMap,
    settingsStore,
    logger
  });

  client.once("clientReady", async () => {
    logger.info(`Bot online como ${client.user.tag}`, {
      userId: client.user.id
    });

    if (config.syncApplicationEmojisOnStart) {
      try {
        const emojiMap = await syncApplicationEmojis({
          applicationId: client.application?.id || client.user.id,
          botToken: config.discordToken,
          assetsDir: config.assetsDir,
          logger
        });
        setEmojiMap(emojiMap);
      } catch (error) {
        logger.warn("Falha no sync de application emojis. Seguindo com fallback padrao.", serializeError(error));
      }
    }

    try {
      await registerCommands({
        discordToken: config.discordToken,
        settingsStore,
        commands,
        client,
        logger
      });
    } catch (error) {
      logger.error("Falha ao registrar slash commands.", serializeError(error));
    }
  });

  client.on("interactionCreate", interactionRouter);

  process.on("unhandledRejection", (reason) => {
    logger.error("UnhandledRejection capturada.", serializeError(reason));
  });

  process.on("uncaughtException", (error) => {
    logger.error("UncaughtException capturada.", serializeError(error));
  });

  await client.login(config.discordToken);
}

function serializeError(error) {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    raw: String(error)
  };
}

bootstrap().catch((error) => {
  logger.error("Falha critica no bootstrap do bot.", serializeError(error));
  process.exit(1);
});
