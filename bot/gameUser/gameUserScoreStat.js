const Plainable = require('./plainable.js');
const ScoreGain = require('./scoreGain.js');

class GameUserScoreGameStat extends Plainable {
    constructor(
        startTimestamp,
        endTimestamp,
        stepsCount,
        hotWord,
        scoreGains = [],
        playersCount = 1,
        rank = 1,
        ) {
        super();
        this.startTimestamp = startTimestamp;
        this.endTimestamp = endTimestamp;
        this.stepsCount = stepsCount;
        this.hotWord = hotWord;
        this.scoreGains = scoreGains;
        this.playersCount = playersCount;
        this.rank = rank;
    }
    static fromPlainTree(plainTree) {
        const scoreGains = plainTree.scoreGains.map(scoreGainPlainTree => ScoreGain.fromPlainTree(scoreGainPlainTree));
        return new GameUserScoreGameStat(plainTree.startTimestamp, plainTree.endTimestamp, plainTree.stepsCount, plainTree.hotWord, scoreGains, plainTree.playersCount, plainTree.rank);
    }
    toPlainTree() {
        return {
            startTimestamp: this.startTimestamp,
            endTimestamp: this.endTimestamp,
            stepsCount: this.stepsCount,
            hotWord: this.hotWord,
            scoreGains: this.scoreGains.map(scoreGain=> scoreGain.toPlainTree()),
            playersCount: this.playersCount,
            rank: this.rank,
        }
    }
    static fromGame(game, genericUserUid) {
        const player = game.players.find(player => player.gameUser.genericUserUid = genericUserUid);
        const startTimestamp = game.startTimestamp;
        const endTimestamp = game.endTimestamp;
        const stepsCount = game.stepNum;
        const hotWord = game.hotWord.wordText;
        const scoreGains = player.score.gains;
        const playersCount = game.players.length;
        const playersByRank = game.players.sort((a, b) => b.score.sum - a.score.sum);
        const rankedPlayers = playersByRank.map((player, rank) => { return {player, rank} });
        const rankedPlayer = rankedPlayers.find(rankedPlayer => rankedPlayer.player === player);
        const rank = rankedPlayer.rank;
        return new GameUserScoreGameStat(startTimestamp, endTimestamp, stepsCount, hotWord, scoreGains, playersCount, rank);
    }
    getScoreGainsGameSummary() {
        const scoreGainsbySubject = this.scoreGains.reduce((scoreGainsbySubject, scoreGain) => {
            let bin = scoreGainsbySubject[scoreGain.subject];
            if (!bin) {
                bin = [];
                scoreGainsbySubject[scoreGain.subject] = bin;
            }
            bin.push(scoreGain);
            return scoreGainsbySubject;
        }, {});
        const scoreGainsSumOverall = this.scoreGains.reduce((sum, scoreGain) => {return sum + scoreGain.value}, 0);
        const scoreGainSumsBySubject = Object.fromEntries(Object.entries(scoreGainsbySubject).map(([key, subjectScoreGains]) => [key, subjectScoreGains.reduce((sum, subjectScoreGain) => {return sum + subjectScoreGain.value}, 0) ]));
        return {
            scoreGainsSumOverall,
            scoreGainSumsBySubject
        }
    }
}

class GameUserScoreGroupStat extends Plainable {
    limit = 1000;
    constructor(
        genericUserGroupUid,
        gameStats = [],
        gamesCount = 0,
        ) {
        super();
        this.genericUserGroupUid = genericUserGroupUid;
        this.gameStats = gameStats;
        this.gamesCount = gamesCount;
    }
    static fromPlainTree(plainTree) {
        const gameStats = plainTree.gameStats.map(gameStatPlainTree => GameUserScoreGameStat.fromPlainTree(gameStatPlainTree));
        return new GameUserScoreGroupStat(plainTree.genericUserGroupUid, gameStats, plainTree.gamesCount);
    }
    toPlainTree() {
        return {
            genericUserGroupUid: this.genericUserGroupUid,
            gameStats: this.gameStats.map(gameStat => gameStat.toPlainTree()),
            gamesCount: this.gamesCount,
        }
    }
    addFromGame(game, genericUserUid) {
        const gameStat = GameUserScoreGameStat.fromGame(game, genericUserUid);
        this.gameStats.push(gameStat);
        this.gameStats.splice(this.limit);
        this.gamesCount++;
    }
    getScoreGainsGroupSummary() {
        const gameSummaries = this.gameStats.map(gameStat => gameStat.getScoreGainsGameSummary());
        const allScoreGainSumsBySubject = gameSummaries.reduce((allScoreGainSumsBySubject, gameSummary) => {
            Object.entries(gameSummary.scoreGainSumsBySubject).forEach(([subject, scoreGainsSum]) => {
                let bin = allScoreGainSumsBySubject[subject];
                if (!bin) {
                    bin = [];
                    allScoreGainSumsBySubject[subject] = bin;
                }
                bin.push(scoreGainsSum);
            });
            return allScoreGainSumsBySubject;
        }, {});
        const maxScoreGainsSumsOverall = gameSummaries.reduce((max, gameSummary) => { return Math.max(max, gameSummary.scoreGainsSumOverall); }, -Infinity);
        const maxScoreGainsSumsBySubjet = Object.fromEntries(Object.entries(allScoreGainSumsBySubject).map(([subject, allScoreGainSums]) => [subject, allScoreGainSums.reduce((max, allScoreGainSum) => { return Math.max(max, allScoreGainSum); }, -Infinity) ]));
        return {
            maxScoreGainsSumsOverall,
            maxScoreGainsSumsBySubjet
        }
    }
}

class GameUserScoreStat extends Plainable {
    constructor (
        groupStats = {},
        gamesCount = 0,
        ) {
        super();
        this.groupStats = groupStats;
        this.gamesCount = gamesCount;
    }
    static fromPlainTree(plainTree) {
        const groupStats = Object.fromEntries(Object.entries(plainTree.groupStats).map(([key, groupStatPlainTree]) => [key, GameUserScoreGroupStat.fromPlainTree(groupStatPlainTree)] ));
        return new GameUserScoreStat(groupStats, plainTree.gamesCount);
    }
    toPlainTree() {
        return {
            groupStats: Object.fromEntries(Object.entries(this.groupStats).map(([key, groupStat]) => [key, groupStat.toPlainTree()] )),
            gamesCount: this.gamesCount,
        }
    }
    addFromGame(game, genericUserUid) {
        const genericUserGroupUid = game.gameUserGroup.genericUserGroupUid;
        let groupStat = this.groupStats[genericUserGroupUid];
        if (!groupStat) {
            groupStat = new GameUserScoreGroupStat(genericUserGroupUid);
            this.groupStats[genericUserGroupUid] = groupStat;
        }
        groupStat.addFromGame(game, genericUserUid);
        this.gamesCount++;
    }

}

module.exports = {
    GameUserScoreGameStat,
    GameUserScoreGroupStat,
    GameUserScoreStat,
}
