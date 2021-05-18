#! /bin/sh
git checkout master && git pull
git checkout develop
git merge master --strategy-option theirs -m "Merged master"
git push