const { REST, Routes } = require("discord.js");

async function registerCommands(options) {
  const {
    discordToken,
    settingsStore,
    commands,
    client,
    logger
  } = options;

  const settings = await settingsStore.get();
  const guildId = settings.guildId;
  const resolvedRuntimeApplicationId = client.application?.id || client.user?.id;
  const applicationId = resolvedRuntimeApplicationId || settings.clientId;

  if (!applicationId) {
    throw new Error("Nao foi possivel determinar o applicationId para registrar comandos.");
  }

  const body = commands.map((command) => command.data.toJSON());
  const rest = new REST({ version: "10" }).setToken(discordToken);

  const target = await upsertCommands({
    rest,
    body,
    applicationId,
    guildId,
    logger
  });

  if (!settings.clientId || settings.clientId !== applicationId) {
    await settingsStore.patch({ clientId: applicationId });
  }

  logger.info("Slash commands registrados com sucesso.", {
    guildId: target === "guild" ? guildId : null,
    scope: target,
    applicationId,
    commandCount: body.length
  });
}

async function upsertCommands({ rest, body, applicationId, guildId, logger }) {
  if (!guildId) {
    logger.warn("DISCORD_GUILD_ID nao configurado. Registrando comandos no escopo global.");
    await rest.put(Routes.applicationCommands(applicationId), { body });
    return "global";
  }

  try {
    await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body });
    return "guild";
  } catch (error) {
  if (isUnauthorizedForApplication(error)) {
      throw createCommandRegistrationError(error, applicationId);
    }

    if (!shouldFallbackToGlobal(error)) {
      throw error;
    }

    logger.warn(
      "Sem acesso para registrar comandos na guild. Tentando registro global.",
      {
        guildId,
        code: error.code,
        status: error.status,
        message: error.message
      }
    );

    try {
      await rest.put(Routes.applicationCommands(applicationId), { body });
    } catch (error) {
      if (isUnauthorizedForApplication(error)) {
        throw createCommandRegistrationError(error, applicationId);
      }

      throw error;
    }

    return "global";
  }
}

function isUnauthorizedForApplication(error) {
  return Number(error?.code ?? 0) === 20012;
}

function createCommandRegistrationError(error, applicationId) {
  const details = [
    "Token sem permissao para registrar comandos nesta aplicacao.",
    `applicationId utilizado: ${applicationId}.`,
    "Verifique se o DISCORD_TOKEN pertence ao mesmo app do DISCORD_CLIENT_ID e do bot convidado no servidor."
  ];

  const wrappedError = new Error(details.join(" "));
  wrappedError.cause = error;
  wrappedError.code = error.code;
  wrappedError.status = error.status;

  return wrappedError;
}

function shouldFallbackToGlobal(error) {
  const apiCode = Number(error?.code ?? 0);
  const status = Number(error?.status ?? 0);

  return status === 403 || apiCode === 50001 || apiCode === 10004 || apiCode === 10002;
}

module.exports = {
  registerCommands
};
