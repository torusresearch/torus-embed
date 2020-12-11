#! /bin/sh
git checkout binance && git pull
git checkout master && git pull
git checkout develop
git merge binance
git merge master --strategy-option theirs -m "Merged master"
git push