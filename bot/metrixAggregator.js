class MetrixAggregator {
    static getMetrixStats(gameUserStorage) {
        const past24Timestamp = Date.now()    -  1 * 24 * 60 * 60 * 1000;
        const pastWeekTimestamp = Date.now()  -  7 * 24 * 60 * 60 * 1000;
        const pastMonthTimestamp = Date.now() - 30 * 24 * 60 * 60 * 1000;
        return {
            singleplayer: {
                '🗓 last day': MetrixAggregator.getMetrixStatsForMode(gameUserStorage, past24Timestamp, 'single'),
                '🗓 last week': MetrixAggregator.getMetrixStatsForMode(gameUserStorage, pastWeekTimestamp, 'single'),
                '🗓 last month': MetrixAggregator.getMetrixStatsForMode(gameUserStorage, pastMonthTimestamp, 'single'),
            },
            multiplayer: {
                '🗓 last day': MetrixAggregator.getMetrixStatsForMode(gameUserStorage, past24Timestamp, 'multi'),
                '🗓 last week': MetrixAggregator.getMetrixStatsForMode(gameUserStorage, pastWeekTimestamp, 'multi'),
                '🗓 last month': MetrixAggregator.getMetrixStatsForMode(gameUserStorage, pastMonthTimestamp, 'multi'),
            },
            all: {
                '🗓 last month': MetrixAggregator.getMetrixStatsForMode(gameUserStorage, pastMonthTimestamp, 'all'),
            }
        };
    }
    static getMetrixStatsForMode(gameUserStorage, pastTimestamp = 0, multiplayerMode = 'all', genericUserUid = null, genericUserGroupUid = null) {
        const usersMetrix = Object.values(gameUserStorage.users).reduce((usersMetrix, user) => {
            const scoreStat = user.scoreStat;
            const userMetrix = Object.values(scoreStat.groupStats).reduce((userMetrix, groupStat) => {
                const isMultiplayerGame = (user.genericUserUid !== groupStat.genericUserGroupUid);
                let isGoodMultiplayerMode;
                if (multiplayerMode === 'multi') {
                    isGoodMultiplayerMode = isMultiplayerGame === true;
                } else if (multiplayerMode === 'single') {
                    isGoodMultiplayerMode = isMultiplayerGame === false;
                } else if (multiplayerMode === 'all') {
                    isGoodMultiplayerMode = true;
                } else {
                    throw new Error('unknown multiplayerMode ' + multiplayerMode);
                }
                let isGoodUser;
                if (genericUserUid === null) {
                    isGoodUser = true;
                } else {
                    isGoodUser = user.genericUserUid === genericUserUid;
                }
                let isGoodUserGroup;
                if (genericUserGroupUid === null) {
                    isGoodUserGroup = true;
                } else {
                    isGoodUserGroup = groupStat.genericUserGroupUid === genericUserGroupUid;
                }
                if (isGoodUser) {
                    const groupMetrix = Object.values(groupStat.gameStats).reduce((groupMetrix, gameStat) => {
                        const isWithinWindow = (gameStat.endTimestamp > pastTimestamp);
                        const isGoodGame = isWithinWindow && isGoodMultiplayerMode && isGoodUserGroup;
                        if (isGoodGame) {
                            groupMetrix.firstStartTimestamp = Math.min(groupMetrix.firstStartTimestamp, gameStat.startTimestamp);
                            groupMetrix.lastEndTimestamp = Math.max(groupMetrix.lastEndTimestamp, gameStat.endTimestamp);
                            groupMetrix.gamesCount++;
                            groupMetrix.playersCountSum += gameStat.playersCount;
                            groupMetrix.playersCountMax = Math.max(groupMetrix.playersCountMax, gameStat.playersCount);
                            groupMetrix.playersCountMin = Math.min(groupMetrix.playersCountMin, gameStat.playersCount);
                            groupMetrix.stepsCountSum += gameStat.stepsCount;
                            groupMetrix.stepsCountMax = Math.max(groupMetrix.stepsCountMax, gameStat.stepsCount);
                            groupMetrix.stepsCountMin = Math.min(groupMetrix.stepsCountMin, gameStat.stepsCount);
                            const score = gameStat.scoreGains.reduce((score, scoreGain) => {return score + scoreGain.value}, 0);
                            groupMetrix.scoreSum += score;
                            groupMetrix.scoreMax = Math.max(groupMetrix.scoreMax, score);
                            groupMetrix.scoreMin = Math.min(groupMetrix.scoreMin, score);
                        }
                        groupMetrix.isNewUser = groupMetrix.isNewUser && isWithinWindow;
                        return groupMetrix;
                    }, {
                        firstStartTimestamp: Infinity,
                        lastEndTimestamp: -Infinity,
                        gamesCount: 0,
                        playersCountSum: 0,
                        stepsCountSum: 0,
                        stepsCountMax: -Infinity,
                        stepsCountMin: Infinity,
                        playersCountMax: -Infinity,
                        playersCountMin: Infinity,
                        scoreSum: 0,
                        scoreMax: -Infinity,
                        scoreMin: Infinity,
                        isNewUser: true,
                    });

                    if (groupMetrix.gamesCount) {
                        userMetrix.firstStartTimestamp = Math.min(userMetrix.firstStartTimestamp, groupMetrix.firstStartTimestamp);
                        userMetrix.lastEndTimestamp = Math.max(userMetrix.lastEndTimestamp, groupMetrix.lastEndTimestamp);

                        userMetrix.gamesCount += groupMetrix.gamesCount;

                        userMetrix.playersCountSum += groupMetrix.playersCountSum;
                        userMetrix.playersCountMax = Math.max(userMetrix.playersCountMax, groupMetrix.playersCountMax);
                        userMetrix.playersCountMin = Math.min(userMetrix.playersCountMin, groupMetrix.playersCountMin);
                        userMetrix.stepsCountSum += groupMetrix.stepsCountSum;
                        userMetrix.stepsCountMax = Math.max(userMetrix.stepsCountMax, groupMetrix.stepsCountMax);
                        userMetrix.stepsCountMin = Math.min(userMetrix.stepsCountMin, groupMetrix.stepsCountMin);
                        userMetrix.scoreSum += groupMetrix.scoreSum;
                        userMetrix.scoreMax = Math.max(userMetrix.scoreMax, groupMetrix.scoreMax);
                        userMetrix.scoreMin = Math.min(userMetrix.scoreMin, groupMetrix.scoreMin);
                    }
                    userMetrix.isNewUser = userMetrix.isNewUser && groupMetrix.isNewUser;
                }
                return userMetrix;
            }, {

                firstStartTimestamp: Infinity,
                lastEndTimestamp: -Infinity,
                gamesCount: 0,
                playersCountSum: 0,
                stepsCountSum: 0,
                stepsCountMax: -Infinity,
                stepsCountMin: Infinity,
                playersCountMax: -Infinity,
                playersCountMin: Infinity,
                scoreSum: 0,
                scoreMax: -Infinity,
                scoreMin: Infinity,
                isNewUser: true,
            });



            if (userMetrix.gamesCount) {
                usersMetrix.firstStartTimestamp = Math.min(usersMetrix.firstStartTimestamp, userMetrix.firstStartTimestamp);
                usersMetrix.lastEndTimestamp = Math.max(usersMetrix.lastEndTimestamp, userMetrix.lastEndTimestamp);

                usersMetrix.gamesCount += userMetrix.gamesCount;
                usersMetrix.usersCount++;
                const playersCountMean = userMetrix.playersCountSum / userMetrix.gamesCount;
                usersMetrix.playersCountMeanSum += playersCountMean;
                const stepsCountMean = userMetrix.stepsCountSum / userMetrix.gamesCount;
                usersMetrix.stepsCountMeanSum += stepsCountMean;
                const scoreMean = userMetrix.scoreSum / userMetrix.gamesCount;
                usersMetrix.scoreMeanSum += scoreMean;

                usersMetrix.playersCountMax = Math.max(usersMetrix.playersCountMax, userMetrix.playersCountMax);
                usersMetrix.playersCountMin = Math.min(usersMetrix.playersCountMin, userMetrix.playersCountMin);
                usersMetrix.stepsCountMax = Math.max(usersMetrix.stepsCountMax, userMetrix.stepsCountMax);
                usersMetrix.stepsCountMin = Math.min(usersMetrix.stepsCountMin, userMetrix.stepsCountMin);
                usersMetrix.scoreMax = Math.max(usersMetrix.scoreMax, userMetrix.scoreMax);
                usersMetrix.scoreMin = Math.min(usersMetrix.scoreMin, userMetrix.scoreMin);
                if (userMetrix.isNewUser) {
                    usersMetrix.newUsersCount++;
                }
            }


            return usersMetrix;
        }, {
            firstStartTimestamp: Infinity,
            lastEndTimestamp: -Infinity,
            usersCount: 0,
            newUsersCount: 0,
            gamesCount: 0,
            playersCountMeanSum: 0,
            stepsCountMeanSum: 0,
            scoreMeanSum: 0,
            stepsCountMax: -Infinity,
            stepsCountMin: Infinity,
            playersCountMax: -Infinity,
            playersCountMin: Infinity,
            scoreMax: -Infinity,
            scoreMin: Infinity,
        });

        if (usersMetrix.usersCount) {
            usersMetrix.playersCountMean = usersMetrix.playersCountMeanSum / usersMetrix.usersCount;
            usersMetrix.stepsCountMean = usersMetrix.stepsCountMeanSum / usersMetrix.usersCount;
            usersMetrix.scoreMean = usersMetrix.scoreMeanSum / usersMetrix.usersCount;
        }

        delete usersMetrix.playersCountMeanSum;
        delete usersMetrix.stepsCountMeanSum;
        delete usersMetrix.scoreMeanSum;

        return usersMetrix;
    }
    static getPrettyFormatedTextForStatsForMode(statsForMode) {
        const pre = {
            gamesCount: statsForMode.gamesCount?.toFixed() || 'N/A',
            usersCount: statsForMode.usersCount?.toFixed() || 'N/A',
            newUsersCount: statsForMode.newUsersCount?.toFixed() || 'N/A',
            firstStartTimestamp: (statsForMode.firstStartTimestamp < Infinity) ? new Date(statsForMode.firstStartTimestamp).toLocaleString('ru-RU', {timeZone: 'UTC'}) : 'N/A',
            lastEndTimestamp: (statsForMode.lastEndTimestamp > -Infinity) ?  new Date(statsForMode.lastEndTimestamp).toLocaleString('ru-RU', {timeZone: 'UTC'}) : 'N/A',
            playersCountMean: statsForMode.playersCountMean?.toFixed(1) || 'N/A',
            playersCountMax: (statsForMode.playersCountMax < Infinity) ? statsForMode.playersCountMax.toFixed(1) : 'N/A',
            playersCountMin: (statsForMode.playersCountMin > -Infinity) ? statsForMode.playersCountMin.toFixed(1) : 'N/A',
            stepsCountMean: statsForMode.stepsCountMean?.toFixed(1) || 'N/A',
            stepsCountMax: (statsForMode.stepsCountMax < Infinity) ? statsForMode.stepsCountMax.toFixed(1) : 'N/A',
            stepsCountMin: (statsForMode.stepsCountMin > -Infinity) ? statsForMode.stepsCountMin.toFixed(1) : 'N/A',
            scoreMean: statsForMode.scoreMean?.toFixed(1) || 'N/A',
            scoreMax: (statsForMode.scoreMax < Infinity) ? statsForMode.scoreMax.toFixed(1) : 'N/A',
            scoreMin: (statsForMode.scoreMin > -Infinity) ? statsForMode.scoreMin.toFixed(1) : 'N/A',
        }
        const pretty = {
            'games count': `<b>${pre.gamesCount}</b>`,
            'users count': `<b>${pre.usersCount}</b> (${pre.newUsersCount} new)`,
            'first start': `<b>${pre.firstStartTimestamp}</b>`,
            'last end': `<b>${pre.lastEndTimestamp}</b>`,
            'players count': `<b>${pre.playersCountMean}</b> ( ${pre.playersCountMin} .. ${pre.playersCountMax} )`,
            'steps count': `<b>${pre.stepsCountMean}</b> ( ${pre.stepsCountMin} .. ${pre.stepsCountMax} )`,
            'score': `<b>${pre.scoreMean}</b> ( ${pre.scoreMin} .. ${pre.scoreMax} )`,
        }
        const text = Object.entries(pretty).map(([k, v]) => `${k} : ${v}` ).join('\n');
        return text;
    }
    static getPrettyFormatedTextForStats(stats) {
        const superModePrettyText = Object.entries(stats).map(([modeSuperKey, v]) => {
            const modePrettyText = Object.entries(v).map(([modeKey, statsForMode]) => {
                const prettyTextForMode = MetrixAggregator.getPrettyFormatedTextForStatsForMode(statsForMode);
                return `<i>${modeKey}</i>\n${prettyTextForMode}\n`;
            }).join('\n');
            return `<b>${modeSuperKey.toUpperCase()}</b>\n${modePrettyText}\n`;
        }).join('\n');
        return superModePrettyText;
    }
}

module.exports = MetrixAggregator;