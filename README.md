# oas-telemetry plugin for outlier alert over messaging
This is a plugin for [oas-telemetry](https://github.com/oas-tools/oas-telemetry)  designed to alert for anomalies (abnormal response times) through messaging (e.g. telegram channel).

## Pre-requirements (telegram channel)
In order to setup the plugin, you need to:
  1. [create a bot](https://core.telegram.org/bots/tutorial) and get its ```TOKEN```
  2. Once the bot is created it should be added to the group that will be the alerting channel).
  3. Get the ```CHAT_ID``` ([more info](https://gist.github.com/nafiesl/4ad622f344cd1dc3bb1ecbe468ff9f8a)) of the group.


## Setup 
In a microservice with [oas-telemetry](https://github.com/oas-tools/oas-telemetry) attached, you should need to send the folloging request: 
```
POST .../telemetry/plugins
{
    "id": "outlier-messaging-plugin",
    "url": "http://localhost:3000/plugin.js",
    "config" : {
        "trainigValueThreshold" : 10,
        "alertChannel":{
            "type": "telegram-bot",
            "token" : "TOKEN",
            "groupId" : "CHAT_ID"
        }
    }
}

```
