#!/usr/bin/env bash
PACKAGE_VERSION=$(cat ./src/embed.js | grep app.tor.us | head -1 | awk -F//app.tor.us/ '{ print $2 }' | sed "s/[']//g")
URL=$(echo s3://app.tor.us/"$PACKAGE_VERSION" | tr -d ' ')
aws s3 cp ./public/embed.min.js $URL/embed.min.js