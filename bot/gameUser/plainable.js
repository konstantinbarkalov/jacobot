class Plainable {
    static fromPlainTree(plainTree) {
        throw new Error('abstract unimplemented');
    }
    toPlainTree() {
        throw new Error('abstract unimplemented');
    }
}
module.exports = Plainable;