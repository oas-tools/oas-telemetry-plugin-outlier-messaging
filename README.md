
# OAS-Telemetry Plugin for Outlier Alert Over Messaging

This plugin is designed for [oas-telemetry](https://github.com/oas-tools/oas-telemetry) to alert for anomalies (abnormal response times) through messaging platforms, such as a Telegram channel.

## Pre-requisites (Telegram Channel)

To set up the plugin, you need to:

1. [Create a bot](https://core.telegram.org/bots/tutorial) and obtain its `TOKEN`.
2. Once the bot is created, add it to the group that will serve as the alerting channel.
3. Get the `CHAT_ID` of the group. For more information, refer to [this guide](https://gist.github.com/nafiesl/4ad622f344cd1dc3bb1ecbe468ff9f8a).

## Setup

In a microservice with [oas-telemetry](https://github.com/oas-tools/oas-telemetry) attached, you should send the following request:

```json
POST .../telemetry/plugins
{
    "id": "outlier-messaging-plugin",
    "url": "https://raw.githubusercontent.com/oas-tools/oas-telemetry-plugin-outlier-messaging/main/public/outlier-plugin.cjs",
    "install": {
        "dependencies": [
            {
                "name": "node-telegram-bot-api",
                "options": "--no-save",
                "override": true
            }
        ],
        "globalOptions": "--no-save",
        "ignoreErrors": false,
        "verbose": true
    },
    "moduleFormat": "cjs",
    "config": {
        "trainingValueThreshold": 10,
        "alertChannel": {
            "type": "telegram-bot",
            "token": "TOKEN",
            "groupId": "CHAT_ID"
        }
    }
}
```

### Explanation of the Configuration

- **id**: The identifier for the plugin. In this case, it is `"outlier-messaging-plugin"`.

- **url**: The URL where the plugin's source code can be accessed. This should point to the JavaScript file that will be executed.

- **install**: An object that contains installation options for the plugin:
    - **dependencies**: An array of dependencies required for the plugin. Each dependency is an object with:
        - **name**: The name of the dependency, e.g., `"node-telegram-bot-api"`.
        - **options**: Installation options. Here, `--no-save` is used to avoid adding the dependency to your `package.json`.
        - **override**: A boolean indicating whether to override existing installations. This is not necessary in this case but can be useful in scenarios where you want to ensure a specific version of a dependency is installed.
    - **globalOptions**: Global installation options. Using `--no-save` again prevents any changes to `package.json`.
    - **ignoreErrors**: A boolean that, if set to true, will allow the installation to proceed even if there are errors.
    - **verbose**: A boolean that, when true, will output detailed logs during installation.

- **moduleFormat**: Specifies the format of the module. In this case, it is set to `"cjs"` (CommonJS).

- **config**: An object containing configuration options for the plugin:
    - **trainingValueThreshold**: The threshold value for triggering alerts.
    - **alertChannel**: An object that defines the alerting channel:
        - **type**: The type of channel to use, which is `"telegram-bot"` in this case.
        - **token**: Your Telegram bot's token.
        - **groupId**: The chat ID of the group where alerts will be sent.

## Additional Notes

The JavaScript file for the plugin is located in the `/dist/plugin-src.js` directory, which is accessible through the API when you run `npm start`. You can also host this file or the plugin you are working on using an online service, such as GitHub Gist.

