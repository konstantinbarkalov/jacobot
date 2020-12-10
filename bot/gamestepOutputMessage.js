class GamestepOutputMessage {
    constructor(game, cooldownDuration, preAnswer, answer, board, citation, shortCitation, hint, aid, scoreDetails, congratz, isFinal, isRepinAndRelink) {
        this.game = game;
        this.cooldownDuration = cooldownDuration;
        this.preAnswer = preAnswer;
        this.answer = answer;
        this.board = board;
        this.citation = citation;
        this.shortCitation = shortCitation;
        this.hint = hint;
        this.aid = aid;
        this.scoreDetails = scoreDetails;
        this.congratz = congratz;
        this.isFinal = isFinal;
        this.isRepinAndRelink = isRepinAndRelink;
    }
}
module.exports = GamestepOutputMessage;
