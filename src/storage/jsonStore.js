const fs = require("node:fs/promises");
const path = require("node:path");

class JsonStore {
  constructor(filePath, defaultValue) {
    this.filePath = filePath;
    this.defaultValue = cloneValue(defaultValue);
    this.ready = false;
    this.queue = Promise.resolve();
  }

  async ensureFile() {
    if (this.ready) {
      return;
    }

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      await fs.access(this.filePath);
    } catch {
      await fs.writeFile(this.filePath, JSON.stringify(this.defaultValue, null, 2), "utf8");
    }

    this.ready = true;
  }

  async read() {
    await this.ensureFile();
    return this.enqueue(async () => this.readDirect());
  }

  async write(nextValue) {
    await this.ensureFile();
    return this.enqueue(async () => {
      await this.writeDirect(nextValue);
      return cloneValue(nextValue);
    });
  }

  async update(updater) {
    await this.ensureFile();
    return this.enqueue(async () => {
      const currentValue = await this.readDirect();
      const clonedCurrent = cloneValue(currentValue);
      const nextValue = await updater(clonedCurrent);

      if (typeof nextValue === "undefined") {
        throw new Error("Updater do JsonStore retornou undefined.");
      }

      await this.writeDirect(nextValue);
      return cloneValue(nextValue);
    });
  }

  enqueue(task) {
    this.queue = this.queue.then(task, task);
    return this.queue;
  }

  async readDirect() {
    const raw = await fs.readFile(this.filePath, "utf8");
    if (!raw.trim()) {
      return cloneValue(this.defaultValue);
    }

    try {
      return JSON.parse(raw);
    } catch {
      return cloneValue(this.defaultValue);
    }
  }

  async writeDirect(nextValue) {
    await fs.writeFile(this.filePath, JSON.stringify(nextValue, null, 2), "utf8");
  }
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = {
  JsonStore
};
