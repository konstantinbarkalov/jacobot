const Plainable = require('./plainable.js');

class GameUserGroup extends Plainable {
    constructor(
        genericUserGroupUid,
        title,
    ) {
        super();
        this.genericUserGroupUid = genericUserGroupUid;
        this.title = title;
    }
    static fromPlainTree(plainTree) {
        return new GameUserGroup(plainTree.genericUserGroupUid, plainTree.title);
    }
    toPlainTree() {
        return {
            genericUserGroupUid: this.genericUserGroupUid,
            title: this.title,
        };
    }
}

module.exports = GameUserGroup;
