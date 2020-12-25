const GameUserGroupRecentStat = require('./gameUserGroupRecentStat.js');
const Plainable = require('./plainable.js');

class GameUserGroup extends Plainable {
    constructor(
        genericUserGroupUid,
        title,
        difficulty = 'auto',
        recentStat = new GameUserGroupRecentStat(),
    ) {
        super();
        this.genericUserGroupUid = genericUserGroupUid;
        this.title = title;
        this.difficulty = difficulty;
        this.recentStat = recentStat;
    }
    static fromPlainTree(plainTree) {
        const recentStat = GameUserGroupRecentStat.fromPlainTree(plainTree.recentStat);
        return new GameUserGroup(plainTree.genericUserGroupUid, plainTree.title, plainTree.difficulty, recentStat);
    }
    toPlainTree() {
        return {
            genericUserGroupUid: this.genericUserGroupUid,
            title: this.title,
            difficulty: this.difficulty,
            recentStat: this.recentStat.toPlainTree(),
        };
    }
}

module.exports = GameUserGroup;
