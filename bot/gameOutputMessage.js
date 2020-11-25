class GameOutputMessage {
    constructor(game, answer, board, citation, hint, congratz, isFinal) {
        this.game = game;
        this.answer = answer;
        this.board = board;
        this.citation = citation;
        this.hint = hint;
        this.congratz = congratz;
        this.isFinal = isFinal;
    }
}
module.exports = GameOutputMessage;
