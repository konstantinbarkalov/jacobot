const fs = require('fs');
const FloatDb = require('./floatDb.js');
const SmartVectorRecordSet = require('./smartVectorRecordSet.js');
class W2v {
    floatDb = new FloatDb();
    async preload() {
        await this.floatDb.preload();
        this.smartVectorRecordSet = new SmartVectorRecordSet(this.floatDb);
    }
    calcProximityBetween(smartVectorRecordA, smartVectorRecordB) {
        let sum = 0;
        for (let i = 0; i < this.floatDb.expectedVectorDim; i++) {
            const valueA = this.floatDb.data[smartVectorRecordA.vocabularyIdx * this.floatDb.expectedVectorDim + i];
            const valueB = this.floatDb.data[smartVectorRecordB.vocabularyIdx * this.floatDb.expectedVectorDim + i];
            sum += valueA * valueB;
        }
        return sum / smartVectorRecordA.magnitude / smartVectorRecordB.magnitude;
    }
    calcProximityToCluster(smartVectorRecord, cluster) {
        let sum = 0;
        for (let i = 0; i < this.floatDb.expectedVectorDim; i++) {
            const referenceValue = this.floatDb.data[smartVectorRecord.vocabularyIdx * this.floatDb.expectedVectorDim + i];
            const clusterValue = cluster.vector[i];
            sum += referenceValue * clusterValue;
        }
        return sum / smartVectorRecord.magnitude / cluster.magnitude;
    }
    calcCluster(smartVectorRecords) {
        let vector = new Array(this.floatDb.expectedVectorDim).fill(0);

        for (let i = 0; i < this.floatDb.expectedVectorDim; i++) {

            const sum = smartVectorRecords.reduce((sum, smartVectorRecord) => {
                const value = this.floatDb.data[smartVectorRecord.vocabularyIdx * this.floatDb.expectedVectorDim + i];
                return sum + value;
            }, 0);
            vector[i] += sum / smartVectorRecords.length;
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