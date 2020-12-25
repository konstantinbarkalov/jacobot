const fs = require('fs');
const GameUser = require('./gameUser.js');
const GameUserGroup = require('./gameUserGroup.js');
const Plainable = require('./plainable.js');

class GameUserStorage extends Plainable {
    static storageFilePath = './db/gameUserStorage.json';
    constructor(
        storageFilePath,
        users = {},
        groups = {},
    ) {
        super();
        this.storageFilePath = storageFilePath;
        this.users = users;
        this.groups = groups;
        this.startAutosave();
    }
    static fromPlainTree(plainTree) {
        const users = Object.fromEntries(Object.entries(plainTree.users).map(([key, userPlainTree]) => [ key, GameUser.fromPlainTree(userPlainTree) ] ));
        const groups = Object.fromEntries(Object.entries(plainTree.groups).map(([key, groupPlainTree]) => [ key, GameUserGroup.fromPlainTree(groupPlainTree) ] ));
        return new GameUserStorage(plainTree.storageFilePath, users, groups);
    }
    toPlainTree() {
        return {
            storageFilePath: this.storageFilePath,
            users: Object.fromEntries(Object.entries(this.users).map(([key, user]) => [key, user.toPlainTree()] )),
            groups: Object.fromEntries(Object.entries(this.groups).map(([key, group]) => [key, group.toPlainTree()] )),
        };
    }
    static preloadFromNewOrExistedStorageFile(storageFilePath = GameUserStorage.storageFilePath) {
        if (fs.existsSync(storageFilePath)) {
            console.log('persisrent storage JSON loading...');
            const json = fs.readFileSync(storageFilePath);
            const storagePlainTree = JSON.parse(json);
            console.log('persisrent storage JSON loaded');
            if (storageFilePath !== storagePlainTree.storageFilePath) {
                throw new Error('actual storageFilePath and storageFilePath in JSON are not same');
                // TODO rething storing storageFilePath inside JSON
            }
            return GameUserStorage.fromPlainTree(storagePlainTree);
        } else {
            console.log('no persisrent storage JSON, starting with empty db');
            return new GameUserStorage(storageFilePath);
        }
    }
    startAutosave() {
        setInterval(()=> {this.save()}, 1000 * 60 );
    }
    save() {
        console.log('persisrent storage JSON file saving...');
        const storagePlainTree = this.toPlainTree();
        const json = JSON.stringify(storagePlainTree, null, 4);
        fs.writeFileSync(this.storageFilePath, json)
        console.log('persisrent storage JSON file saved');;
    }
    getOrCreateGameUser(genericUserUid, name) {
        const gameUser = this.users[genericUserUid];
        if (gameUser) {
            return gameUser;
            gameUser.name = name;
        } else {
            const newGameUser = new GameUser(genericUserUid, name);
            this.users[genericUserUid] = newGameUser;
            this.save();
            return newGameUser;
        }
    }
    getOrCreateGameUserGroup(genericUserGroupUid, title) {
        const gameUserGroup = this.groups[genericUserGroupUid];
        if (gameUserGroup) {
            gameUserGroup.title = title;
            return gameUserGroup;
        } else {
            const newGameUserGroup = new GameUserGroup(genericUserGroupUid, title);
            this.groups[genericUserGroupUid] = newGameUserGroup;
            this.save();
            return newGameUserGroup;
        }
    }
}

module.exports = GameUserStorage;
