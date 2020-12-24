const fs = require('fs');
const NlpBackend = require('./nlpBackend/nlpBackend.js');
//const Game = require("./game.js");
const Game = require("./game.js");
const GamestepOutputMessage = require("./gamestepOutputMessage.js");
const GameUserStorage = require('./gameUser/gameUserStorage.js');
const MetrixAggregator = require('./metrixAggregator.js');
const MiscOutputMessage = require('./miscOutputMessage.js');
const aboutText = fs.readFileSync('./html/about.html',{encoding: 'utf8'});
const rulesText = fs.readFileSync('./html/rules.html',{encoding: 'utf8'});
const helpText = fs.readFileSync('./html/help.html',{encoding: 'utf8'});
const linksText = fs.readFileSync('./html/links.html',{encoding: 'utf8'});
const jacobotVersion = require('./package.json').version; // for debug
class GameMaster {
    activeGames = [];
    nlpBackend = new NlpBackend();
    gameUserStorage = null;
    async preload() {
        await this.nlpBackend.preload();
        this.gameUserStorage = GameUserStorage.preloadFromNewOrExistedStorageFile();
    }
    startNewGame(gameUser, gameUserGroup) {
        const game = new Game(this, gameUser, gameUserGroup);
        this.activeGames.push(game);
        return game.start();
    }
    removeActiveGame(game) {
        this.activeGames = this.activeGames.filter((activeGame) => activeGame !== game);
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
    onLinks() {
        return new MiscOutputMessage(null, linksText);
        //const liveLinksHtml = fs.readFileSync('./links.html',{encoding: 'utf8'});
        //return new MiscOutputMessage(null, liveLinksHtml);
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
        const metrixStats = MetrixAggregator.getMetrixStats(this.gameUserStorage);
        const metrixStatsPrettyHtml = MetrixAggregator.getPrettyFormatedTextForStats(metrixStats);
        return new MiscOutputMessage(null, metrixStatsPrettyHtml);
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
    onGameStat(genericUserGroupUid, genericUserGroupName) {
        let statOutputMessage;
        let gameUserGroup = this.gameUserStorage.getOrCreateGameUserGroup(genericUserGroupUid, genericUserGroupName);
        const activeGame = this.activeGames.find(activeGame => activeGame.gameUserGroup === gameUserGroup);

        if (activeGame) {
            statOutputMessage = activeGame.onGameStat();
        } else {
            statOutputMessage = new MiscOutputMessage(null, 'В этом чате не идет активных игр. Быть может /help?');
        }
        return statOutputMessage;
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