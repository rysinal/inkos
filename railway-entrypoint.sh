#!/bin/sh
set -eu

mkdir -p /data/books /data/radar

if [ ! -f /data/inkos.json ]; then
  umask 077
  printf '%s\n' '{
  "name": "inkos-railway",
  "version": "0.1.0",
  "language": "zh",
  "llm": {
    "provider": "openai",
    "service": "custom",
    "configSource": "studio",
    "baseUrl": "",
    "model": "",
    "apiFormat": "chat",
    "stream": true
  },
  "notify": [],
  "inputGovernanceMode": "v2",
  "daemon": {
    "schedule": {
      "radarCron": "0 */6 * * *",
      "writeCron": "*/15 * * * *"
    },
    "maxConcurrentBooks": 3
  }
}' > /data/inkos.json
fi

if [ ! -f /data/.inkos-node-owned ]; then
  chown -R node:node /data
  touch /data/.inkos-node-owned
  chown node:node /data/.inkos-node-owned
fi

exec setpriv --reuid=node --regid=node --init-groups \
  node packages/studio/dist/api/index.js /data
