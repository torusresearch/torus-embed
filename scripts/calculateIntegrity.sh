#!/usr/bin/env bash
HASH="$(cat ./public/embed.min.js | openssl dgst -sha384 -binary | openssl base64 -A)"
sed -i -e "s@sha384-..*@sha384-$HASH\')@g" ./public/embed.user.js