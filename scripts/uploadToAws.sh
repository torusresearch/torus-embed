#!/usr/bin/env bash
URL=''
PACKAGE_VERSION=''
if [ "$CIRCLE_BRANCH" == 'master' ]; then
  PACKAGE_VERSION=$(cat ./src/embed.js | grep app.tor.us | head -1 | awk -F//app.tor.us/ '{ print $2 }' | sed "s/[']//g")
  URL=$(echo s3://app.tor.us/"$PACKAGE_VERSION" | tr -d ' ')
elif [ "$CIRCLE_BRANCH" == 'staging' ]; then
  PACKAGE_VERSION=$(cat ./src/embed.js | grep staging.tor.us | head -1 | awk -F//staging.tor.us/ '{ print $2 }' | sed "s/[']//g")
  URL=$(echo s3://staging.tor.us/"$PACKAGE_VERSION" | tr -d ' ')
fi
aws s3 cp ./public/embed.min.js $URL/embed.min.js