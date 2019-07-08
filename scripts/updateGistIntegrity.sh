#!/usr/bin/env bash
git clone git@gist.github.com:733405286923fa047af4cb26d167acd4.git ~/gist
PACKAGE_VERSION=$(cat ./src/embed.js | grep app.tor.us | head -1 | awk -F//app.tor.us/ '{ print $2 }' | sed "s/[']//g")
cd public/
HASH="$(cat embed.min.js | openssl dgst -sha384 -binary | openssl base64 -A)"
cd ~/gist
echo "<script src=\"https://app.tor.us/$PACKAGE_VERSION/embed.min.js\"
        integrity=\"sha384-$HASH\"
        crossorigin=\"anonymous\"></script>" > torus-embed.html

git config user.email "chaitanya.potti@gmail.com"
git config user.name "chaitanyapotti"
git diff --quiet && git diff --staged --quiet || (git commit -am "Updating embed" && git push origin master)