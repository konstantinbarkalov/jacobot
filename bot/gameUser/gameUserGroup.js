const GameUserGroupRecentStat = require('./gameUserGroupRecentStat.js');
const Plainable = require('./plainable.js');

class GameUserGroup extends Plainable {
    constructor(
        genericUserGroupUid,
        title,
        recentStat = new GameUserGroupRecentStat(),
    ) {
        super();
        this.genericUserGroupUid = genericUserGroupUid;
        this.title = title;
        this.recentStat = recentStat;
    }
    static fromPlainTree(plainTree) {
        const recentStat = GameUserGroupRecentStat.fromPlainTree(plainTree.recentStat);
        return new GameUserGroup(plainTree.genericUserGroupUid, plainTree.title, recentStat);
    }
    toPlainTree() {
        return {
            genericUserGroupUid: this.genericUserGroupUid,
            title: this.title,
            recentStat: this.recentStat.toPlainTree(),
        };
    }
}

module.exports = GameUserGroup;
