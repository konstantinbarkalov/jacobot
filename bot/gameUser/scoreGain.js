const Plainable = require('./plainable.js');

class ScoreGain extends Plainable {
    constructor(
        subject,
        value,
        stepNum,
        fragment,
        congratz = 1,
        isFinal = false
    ) {
        super();
        this.subject = subject;
        this.value = value;
        this.stepNum = stepNum;
        this.fragment = fragment;
        this.congratz = congratz;
        this.isFinal = isFinal;
    }
    static fromPlainTree(plainTree) {
        return new ScoreGain(plainTree.subject, plainTree.value, plainTree.stepNum, plainTree.fragment, plainTree.congratz, plainTree.isFinal);
    }
    toPlainTree() {
        return {
            subject: this.subject,
            value: this.value,
            stepNum: this.stepNum,
            fragment: this.fragment,
            congratz: this.congratz,
            isFinal: this.isFinal,
        };
    }
}
module.exports = ScoreGain;
