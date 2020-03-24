#!/usr/bin/env bash
URL=''
PACKAGE_VERSION=$(cat package.json \
  | grep '"version"' \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g')
if [ "$CIRCLE_BRANCH" == 'master' ]; then
  URL=$(echo s3://app.tor.us/v"$PACKAGE_VERSION" | tr -d ' ')
elif [ "$CIRCLE_BRANCH" == 'staging' ]; then
  URL=$(echo s3://staging.tor.us/v"$PACKAGE_VERSION" | tr -d ' ')
fi
aws s3 cp ./public/embed.min.js $URL/embed.min.js