#!/usr/bin/env bash
# Package the channel and sideload it to a Roku TV in developer mode.
#
# Usage:
#   ./tools/install.sh [ROKU_IP] [ROKU_DEV_PASSWORD]
#
# Defaults can also come from ROKU_IP / ROKU_DEV_PASSWORD env vars.
# Enable developer mode first: Settings > System > Advanced system settings >
# Developer options (requires a reboot; set a dev password there).
set -euo pipefail
cd "$(dirname "$0")/.."

ROKU_IP="${1:-${ROKU_IP:-192.168.1.102}}"
ROKU_PASS="${2:-${ROKU_DEV_PASSWORD:-}}"
if [ -z "$ROKU_PASS" ]; then
    echo "set ROKU_DEV_PASSWORD or pass the dev password as the 2nd argument" >&2
    exit 1
fi
ZIP="channel.zip"

rm -f "$ZIP"
( cd channel && zip -q -r "../$ZIP" manifest source components images -x "*.DS_Store" )
echo "packaged $ZIP ($(du -h "$ZIP" | cut -f1))"

curl -sS --fail --show-error --digest --user "rokudev:${ROKU_PASS}" \
     -F "mysubmit=Install" -F "archive=@${ZIP}" \
     "http://${ROKU_IP}/plugin_install"
echo "installed to ${ROKU_IP}"

curl -sS "http://${ROKU_IP}:8060/launch/dev" > /dev/null
echo "launched dev channel"
