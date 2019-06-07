#!/usr/bin/env bash
git clone git@github.com:torusresearch/torus-website.git ~/torus-website
PACKAGE_VERSION=$(cat ~/torus-website/app/package.json \
  | grep buildVersion \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g')
HASH="$(cat ./public/embed.min.js | openssl dgst -sha384 -binary | openssl base64 -A)"
URL=$(echo s3://static.dev.tor.us/"$PACKAGE_VERSION" | tr -d ' ')
aws s3 cp ./public/embed.min.js $URL/embed.min.js