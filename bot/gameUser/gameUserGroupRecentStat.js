const Plainable = require('./plainable.js');

class GameUserGroupRecentStat extends Plainable {
    constructor (
        recentHotLemmas = [],
        ) {
        super();
        this.recentHotLemmas = recentHotLemmas;

    }
    static fromPlainTree(plainTree) {
        return new GameUserGroupRecentStat(plainTree?.recentHotLemmas); // TODO remove ?, it'a silly way to migrate db
    }
    toPlainTree() {
        return {
            recentHotLemmas: this.recentHotLemmas,
        }
    }
    addFromGame(game) {
        const hotLemma = game.hotWord.lemmaText;
        this.recentHotLemmas.push(hotLemma);
        const recentLemmasLimit = 100;
        if (this.recentHotLemmas.length > recentLemmasLimit) {
            this.recentHotLemmas.splice(0, recentLemmasLimit);
        }
    }

}

module.exports = GameUserGroupRecentStat;
