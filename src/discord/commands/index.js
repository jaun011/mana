const { createBotConfigCommand } = require("./botconfig");
const { createPingCommand } = require("./ping");
const { createHostInfoCommand } = require("./hostinfo");
const { createAppCommand } = require("./app");
const { createHostApiCommand } = require("./hostapi");

function createCommands(dependencies) {
  return [
    createBotConfigCommand(dependencies),
    createAppCommand(dependencies),
    createHostApiCommand(dependencies),
    createHostInfoCommand(dependencies),
    createPingCommand(dependencies)
  ];
}

module.exports = {
  createCommands
};
