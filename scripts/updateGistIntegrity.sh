#!/usr/bin/env bash
git config --global user.email "chaitanya.potti@gmail.com"
git config --global user.name "chaitanyapotti"
git clone git@github.com:733405286923fa047af4cb26d167acd4.git ~/gist
PACKAGE_VERSION=$(cat package.json \
  | grep '"version"' \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g')
cd public/
HASH="$(cat embed.min.js | openssl dgst -sha384 -binary | openssl base64 -A)"
cd ~/gist
URL=$(echo https://app.tor.us/v"$PACKAGE_VERSION"/embed.min.js | tr -d ' ')
echo "<script src=\"$URL\"
        integrity=\"sha384-$HASH\"
        crossorigin=\"anonymous\"></script>" > torus-embed.html

git diff --quiet && git diff --staged --quiet || (git commit -am "Updating embed" && git push origin master)