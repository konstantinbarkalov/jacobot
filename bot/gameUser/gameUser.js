const Plainable = require('./plainable.js');
const { GameUserScoreStat } = require("./gameUserScoreStat");

class GameUser extends Plainable {
    constructor(
        genericUserUid,
        name,
        scoreStat = new GameUserScoreStat(),
    ) {
        super();
        this.genericUserUid = genericUserUid;
        this.name = name;
        this.scoreStat = scoreStat;
    }
    static fromPlainTree(plainTree) {
        const scoreStat = GameUserScoreStat.fromPlainTree(plainTree.scoreStat);
        return new GameUser(plainTree.genericUserUid, plainTree.name, scoreStat);
    }
    toPlainTree() {
        return {
            genericUserUid: this.genericUserUid,
            name: this.name,
            scoreStat: this.scoreStat.toPlainTree(),
        };
    }
}
module.exports = GameUser;
