#! /bin/sh
git checkout staging && git pull
git checkout master && git pull
git checkout develop
git merge staging
git merge master --strategy-option theirs -m "Merged master"
git push