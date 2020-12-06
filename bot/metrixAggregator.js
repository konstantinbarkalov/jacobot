//const Devlog = require('./db/devlog');
class MetrixAggregator {
    gameBuffer = [];
    process(game) {
        this.gameBuffer = this.gameBuffer.slice(-500);
        this.gameBuffer.push(game);
        //Devlog.process(game);
    }
    getMetrixStats() {
        const lastGame = this.gameBuffer[this.gameBuffer.length - 1];
        const aggregationSum = this.gameBuffer.reduce((aggregation, game) => {
            aggregation.durationSum += game.endTimestamp - game.startTimestamp;
            aggregation.stepsSum += game.stepNum;
            aggregation.playersSum += game.players.length;
            return aggregation;
        }, {durationSum: 0, stepsSum: 0, playersSum: 0});
        const aggregation = {
            durationMean: aggregationSum.durationSum / this.gameBuffer.length,
            stepsMean: aggregationSum.stepsSum / this.gameBuffer.length,
            playersMean: aggregationSum.playersSum / this.gameBuffer.length,
            bufferLength: this.gameBuffer.length,
            lastGameDate: lastGame ? lastGame.endTimestamp : null,
        }
        return aggregation;
    }
}

module.exports = MetrixAggregator;