const fs = require('fs');
const GameUser = require('./gameUser');
const GameUserGroup = require('./gameUserGroup');
class GameUserStorage {
    storageFilePath = './db/gameUserStorage.json';
    users = {};
    groups = {};
    preload() {
        if (fs.existsSync(this.storageFilePath)) {
            console.log('persisrent storage loading...');
            const json = fs.readFileSync(this.storageFilePath);
            const storagePlainTree = JSON.parse(json);
            this.users = Object.fromEntries(Object.entries(storagePlainTree.users).map(([key, userPlainTree]) => {
                const user = new GameUser(userPlainTree.genericUserUid, userPlainTree.name, userPlainTree.gender, userPlainTree.stat);
                return [key, user];
            }));
            this.userGroups = Object.fromEntries(Object.entries(storagePlainTree.userGroups).map(([key, userGroupPlainTree]) => {
                const userGroup = new GameUserGroup(userGroupPlainTree.genericUserGroupUid, userGroupPlainTree.title);
                return [key, userGroup];
            }));
            console.log('persisrent storage loaded');;
        } else {
            console.log('no persisrent storage, starting with empty db');
            this.users = {};
            this.userGroups = {};
        }
        setInterval(()=> {this.save()}, 1000 * 60 );
    }
    save() {
        console.log('persisrent storage saving...');
        const storagePlainTree = {
            users: this.users,
            userGroups: this.userGroups,
        };
        const json = JSON.stringify(storagePlainTree, null, 4);
        fs.writeFileSync(this.storageFilePath, json)
        console.log('persisrent storage saved');;
    }
    getOrCreateGameUser(genericUserUid, name) {
        const gameUser = this.users[genericUserUid];
        if (gameUser) {
            return gameUser;
        } else {
            const newGameUser = new GameUser(genericUserUid, name);
            this.users[genericUserUid] = newGameUser;
            this.save();
            return newGameUser;
        }
    }
    getOrCreateGameUserGroup(genericUserGroupUid, name) {
        const gameUserGroup = this.userGroups[genericUserGroupUid];
        if (gameUserGroup) {
            return gameUserGroup;
        } else {
            const newGameUserGroup = new GameUserGroup(genericUserGroupUid, name);
            this.userGroups[genericUserGroupUid] = newGameUserGroup;
            this.save();
            return newGameUserGroup;
        }
    }
}
module.exports = GameUserStorage;
