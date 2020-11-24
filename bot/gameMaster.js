const NlpBackend = require('./nlpBackend/easy/backend.js');
//const Game = require("./game.js");
const Game = require("./game2.js");
const GameOutputMessage = require("./gameOutputMessage.js");
const GameUser = require("./gameUser.js");
const GameUserGroup = require('./gameUserGroup.js');
const GameUserStorage = require('./gameUserStorage.js');
class GameMaster {
    activeGames = [];
    nlpBackend = new NlpBackend();
    gameUserStorage = new GameUserStorage();
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
    }
    onMessage(messageText, genericUserUid, genericUserName, genericUserGroupUid, genericUserGroupName) {
        let gameOutputMessage;
        let gameUser = this.gameUserStorage.getOrCreateGameUser(genericUserUid, genericUserName );
        let gameUserGroup = this.gameUserStorage.getOrCreateGameUserGroup(genericUserGroupUid, genericUserGroupName);

        const activeGame = this.activeGames.find(activeGame => activeGame.gameUserGroup === gameUserGroup);

        if (!activeGame) {
            if (messageText[0] === '+') {
                gameOutputMessage = this.startNewGame(gameUser, gameUserGroup);
            } else {
                gameOutputMessage = new GameOutputMessage('Если захочешь сыграть, пиши "+" в чат.');
            }
        } else {
            if (messageText[0] === '!') {
                gameOutputMessage = activeGame.onAbort();
                this.removeActiveGame(activeGame);
            } else {
                gameOutputMessage = activeGame.onMessage(messageText, gameUser);
            }
        }
        return gameOutputMessage;
    }
}
module.exports = GameMaster;