const fs = require('fs');
const FloatDb = require('./floatDb.js');
const VectorRecordSet = require('./vectorRecordSet.js');
class W2v {
    floatDb = new FloatDb();
    async preload() {
        await this.floatDb.preload();
        this.vectorRecordSet = new VectorRecordSet(this.floatDb);
    }
    calcProximityBetween(vectorRecordA, vectorRecordB) {
        let sum = 0;
        for (let i = 0; i < this.floatDb.expectedVectorDim; i++) {
            const valueA = this.floatDb.data[vectorRecordA.vocabularyIdx * this.floatDb.expectedVectorDim + i];
            const valueB = this.floatDb.data[vectorRecordB.vocabularyIdx * this.floatDb.expectedVectorDim + i];
            sum += valueA * valueB;
        }
        return sum / vectorRecordA.magnitude / vectorRecordB.magnitude;
    }
    calcProximityToCluster(vectorRecord, cluster) {
        let sum = 0;
        for (let i = 0; i < this.floatDb.expectedVectorDim; i++) {
            const referenceValue = this.floatDb.data[vectorRecord.vocabularyIdx * this.floatDb.expectedVectorDim + i];
            const clusterValue = cluster.vector[i];
            sum += referenceValue * clusterValue;
        }
        return sum / vectorRecord.magnitude / cluster.magnitude;
    }
    calcCluster(vectorRecords) {
        let vector = new Array(this.floatDb.expectedVectorDim).fill(0);

        for (let i = 0; i < this.floatDb.expectedVectorDim; i++) {

            const sum = vectorRecords.reduce((sum, vectorRecord) => {
                const value = this.floatDb.data[vectorRecord.vocabularyIdx * this.floatDb.expectedVectorDim + i];
                return sum + value;
            }, 0);
            vector[i] += sum / vectorRecords.length;
        }

        const magnitudeSquare = vector.reduce((magnitude, value) => {return magnitude + value * value }, 0 );
        const magnitude = Math.sqrt(magnitudeSquare);

        const cluster = {
            vector,
            magnitude
        }
        return cluster;
    }
}

module.exports = W2v;