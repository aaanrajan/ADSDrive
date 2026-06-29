const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const EventEmitter = require("events");

function ConfigService() {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(30);
    const configFilePath = path.join(app.getPath("userData"), "config.json");

    function saveConfig(config) {
        fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), "utf-8");
                console.log('config saved');
        emitter.emit("config-updated");
    }

    function loadConfig() {
        if (fs.existsSync(configFilePath)) {
            try {
                const data = fs.readFileSync(configFilePath, "utf-8");
                if (!data) {
                    console.warn("Config file is empty, returning default config.");
                    return {};
                }
                return JSON.parse(data);
            } catch (err) {
                console.error("Error parsing config:", err);
                return null;
            }
        }
        return null;
    }

    function setConfigValue(key, value) {
        const config = loadConfig() || {};
        config[key] = value;
        saveConfig(config);
    }

    function getConfigValue(key) {
        const config = loadConfig() || {};
        return config[key];
    }

    function updateConfig(updates) {
        const config = loadConfig() || {};
        Object.assign(config, updates);
        saveConfig(config);
    }
      function on(listener) {
        console.log('listen', listener.name || 'anonymous' , "\n\n");
        emitter.on("config-updated", listener);
    }
    return {
        saveConfig,
        loadConfig,
        setConfigValue,
        getConfigValue,
        updateConfig,
        on
    };
}

module.exports = ConfigService();
