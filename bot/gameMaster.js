const fs = require('fs');
const NlpBackend = require('./nlpBackend/easy/backend.js');
//const Game = require("./game.js");
const Game = require("./game.js");
const GamestepOutputMessage = require("./gamestepOutputMessage.js");
const GameUserStorage = require('./gameUserStorage.js');
const MetrixAggregator = require('./metrixAggregator.js');
const MiscOutputMessage = require('./miscOutputMessage.js');
const aboutText = fs.readFileSync('./about.html',{encoding: 'utf8'});
const rulesText = fs.readFileSync('./rules.html',{encoding: 'utf8'});
const helpText = fs.readFileSync('./help.html',{encoding: 'utf8'});
const jacobotVersion = require('./package.json').version; // for debug
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
        return new MiscOutputMessage(null, aboutText);
        //const liveAboutHtml = fs.readFileSync('./about.html',{encoding: 'utf8'});
        //return new MiscOutputMessage(null, liveAboutHtml);
    }
    onRules() {
        return new MiscOutputMessage(null, rulesText);
        //const liveRulesHtml = fs.readFileSync('./rules.html',{encoding: 'utf8'});
        //return new MiscOutputMessage(null, liveRulesHtml);
    }
    onHelp() {
        return new MiscOutputMessage(null, helpText);
        //const liveHelpHtml = fs.readFileSync('./help.html',{encoding: 'utf8'});
        //return new MiscOutputMessage(null, liveHelpHtml);
    }
    onDebug(ctx) {

        const debugMessage = {
            jacobotVersion,
            message: ctx.message,
            memoryUsage: Object.fromEntries(Object.entries(process.memoryUsage()).map(([key, value])=> {
                return [key, (value / 1024 / 1024).toFixed(0) + 'Mb'];
            })),
        }
        const debugMessageJson = JSON.stringify(debugMessage, null, 4);
        return new MiscOutputMessage(null, debugMessageJson);
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
        const statsAsJson = JSON.stringify(humanReadableStats, null, 4);
        return new MiscOutputMessage(null, statsAsJson);
    }
    onUnknown() {
        const gamestepOutputMessage = new MiscOutputMessage(null, 'Если захочешь сыграть, пиши /go в чат.');
        return gamestepOutputMessage;
    }
    onGo(genericUserUid, genericUserName, genericUserGroupUid, genericUserGroupName) {
        let gamestepOutputMessage;
        let gameUser = this.gameUserStorage.getOrCreateGameUser(genericUserUid, genericUserName );
        let gameUserGroup = this.gameUserStorage.getOrCreateGameUserGroup(genericUserGroupUid, genericUserGroupName);
        const activeGame = this.activeGames.find(activeGame => activeGame.gameUserGroup === gameUserGroup);

        if (!activeGame) {
            gamestepOutputMessage = this.startNewGame(gameUser, gameUserGroup);
        } else {
            gamestepOutputMessage = new MiscOutputMessage(null, 'В этом чате уже идет игра. Пиши /stop если хочешь её закончить.');
        }
        return gamestepOutputMessage;
    }
    onAbort(genericUserUid, genericUserName, genericUserGroupUid, genericUserGroupName) {
        let gamestepOutputMessage;
        let gameUser = this.gameUserStorage.getOrCreateGameUser(genericUserUid, genericUserName );
        let gameUserGroup = this.gameUserStorage.getOrCreateGameUserGroup(genericUserGroupUid, genericUserGroupName);
        const activeGame = this.activeGames.find(activeGame => activeGame.gameUserGroup === gameUserGroup);
        if (activeGame) {
            gamestepOutputMessage = activeGame.onAbort(gameUser, gameUserGroup);
        } else {
            gamestepOutputMessage = new MiscOutputMessage(null, 'В этом чате не идет игра, заканчивать нечего. Может быть /help?');
        }
        return gamestepOutputMessage;
    }
    onMessage(messageText, genericUserUid, genericUserName, genericUserGroupUid, genericUserGroupName) {
        let gamestepOutputMessage;
        let gameUser = this.gameUserStorage.getOrCreateGameUser(genericUserUid, genericUserName );
        let gameUserGroup = this.gameUserStorage.getOrCreateGameUserGroup(genericUserGroupUid, genericUserGroupName);

        const activeGame = this.activeGames.find(activeGame => activeGame.gameUserGroup === gameUserGroup);

        if (!activeGame) {
            if (messageText === '+') {
                gamestepOutputMessage = this.onGo(genericUserUid, genericUserName, genericUserGroupUid, genericUserGroupName);
            } else if (messageText === '?') {
                gamestepOutputMessage = this.onAbout();
            } else {
                gamestepOutputMessage = this.onUnknown();
            }
        } else {
            if (messageText === '!!!') {
                gamestepOutputMessage = this.onAbort(genericUserUid, genericUserName, genericUserGroupUid, genericUserGroupName);
            } else {
                gamestepOutputMessage = activeGame.onMessage(messageText, gameUser);
            }
        }
        return gamestepOutputMessage;
    }
}
module.exports = GameMaster;