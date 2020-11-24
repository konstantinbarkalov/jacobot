class GameUser {
    constructor(genericUserUid, name, gender = 'unspecified', stat = { score: 0, gamesCount: 0 }) {
        this.genericUserUid = genericUserUid;
        this.name = name;
        this.gender = gender;
        this.stat = stat;
    }
}
module.exports = GameUser;
