const fs = require('fs');
const NlpBackend = require('./nlpBackend/easy/backend.js');
//const Game = require("./game.js");
const Game = require("./game.js");
const GameOutputMessage = require("./gameOutputMessage.js");
const GameUserStorage = require('./gameUserStorage.js');
const MetrixAggregator = require('./metrixAggregator.js');
const aboutText = fs.readFileSync('./about.html',{encoding: 'utf8'});
const rulesText = fs.readFileSync('./rules.html',{encoding: 'utf8'});
class GameMaster {
    activeGames = [];
    nlpBackend = new NlpBackend();
    gameUserStorage = new GameUserStorage();
    metrixAggregator = new MetrixAggregator();
    async preload() {
        await this.nlpBackend.preload();
        await this.gameUserStorage.preload();
    }
    startNewGame(gameUser, gameUserGroup) {
        const game = new Game(this, gameUser, gameUserGroup);
        this.activeGames.push(game);
        return game.start();
    }
    removeActiveGame(game) {
        this.activeGames = this.activeGames.filter((activeGame) => activeGame !== game);
        this.metrixAggregator.process(game);
    }
    onAbout() {
        //return new GameOutputMessage(null, aboutText);
        const liveAboutHtml = fs.readFileSync('./about.html',{encoding: 'utf8'});
        return new GameOutputMessage(null, liveAboutHtml);
    }
    onRules() {
        //return new GameOutputMessage(null, rulesText);
        const liveRulesHtml = fs.readFileSync('./rules.html',{encoding: 'utf8'});
        return new GameOutputMessage(null, liveRulesHtml);
    }
    onMetrix() {
        const metrixStats = this.metrixAggregator.getMetrixStats();
        const humanReadableStats = {
            durationMean: (metrixStats.durationMean / 1000).toFixed(1) + ' sec',
            stepsMean: (metrixStats.stepsMean).toFixed(1),
            playersMean: (metrixStats.playersMean).toFixed(1),
            bufferLength: metrixStats.bufferLength,
            lastGameDate: metrixStats.lastGameDate ? new Date(metrixStats.lastGameDate) : 'never',

        }
        const liveRulesText = JSON.stringify(humanReadableStats, null, 4);
        return new GameOutputMessage(null, liveRulesText);
    }
    onMessage(messageText, genericUserUid, genericUserName, genericUserGroupUid, genericUserGroupName) {
        let gameOutputMessage;
        let gameUser = this.gameUserStorage.getOrCreateGameUser(genericUserUid, genericUserName );
        let gameUserGroup = this.gameUserStorage.getOrCreateGameUserGroup(genericUserGroupUid, genericUserGroupName);

        const activeGame = this.activeGames.find(activeGame => activeGame.gameUserGroup === gameUserGroup);

        if (!activeGame) {
            if (messageText[0] === '+') {
                gameOutputMessage = this.startNewGame(gameUser, gameUserGroup);
            } else if (messageText[0] === '?') {
                gameOutputMessage = this.onAbout();
            } else {
                gameOutputMessage = new GameOutputMessage(null, 'Если захочешь сыграть, пиши "+" в чат.');
            }
        } else {
            if (messageText[0] === '!') {
                gameOutputMessage = activeGame.onAbort();
            } else {
                gameOutputMessage = activeGame.onMessage(messageText, gameUser);
            }
        }
        return gameOutputMessage;
    }
}
module.exports = GameMaster;