
class PredictionRepository extends DataRepository {
    
    constructor(databaseConnectionString){
        super(databaseConnectionString);
    }
    
    add(prediction){
        this.db.priceMovementPredictions.insert(prediction);
    }
    
    getLastPrediction(callback){
        this.db.priceMovementPredictions.find({}).sort({ timestamp: -1 }).limit(1,
            (error, resp) => {
                this._handleDatabaseResponse(error, resp[0] || {}, callback); 
            });
    }
    
    getByPredictionModel(modelName, callback){
        this.db.priceMovementPredictions.find({ modelName: modelName })
                                        .sort({ timestamp: -1 }, (error, resp) => this._handleDatabaseResponse(error, resp, callback));
    }
    
    getGroupedByPredictionModel(callback){
        this.db.priceMovementPredictions.aggregate([
            { $group : { _id : "$modelName", predictions: { $push: "$$ROOT" } } }
        ], (error, resp) => { this._handleDatabaseResponse(error, resp, callback); });
    }
    
    getGroupedByCoinsThenByPredictionModels(callback){
        this.db.priceMovementPredictions.aggregate([
            { 
                $group: { 
                    _id: { coinTicker: "$coinTicker", modelName: "$modelName", modelLabel: "$modelLabel" },
                    predictionCount: { $sum: 1 },
                    correctPredictionCount: {$sum: {$cond: [{$eq: ['$predictionWasCorrect', true]}, 1, 0]}},
                    currentPrediction: { $last: "$prediction" },
                    currentPredictionPredictedOn : { $last: "$unixTimestamp"}
                } 
            }, 
            { 
                $group : { 
                    _id :  "$_id.coinTicker",
                    models: {
                        $push: { 
                            modelName: "$_id.modelName",
                            modelLabel: "$_id.modelLabel",
                            predictionCount: "$predictionCount",
                            correctPredictionCount: "$correctPredictionCount",
                            predictionAccuracy: { 
                                $multiply: [100, 
                                    // substract one for the current prediction with no result
                                    { $divide: ["$correctPredictionCount", { $subtract: ["$predictionCount", 1]} ]}
                                ]
                            },
                            currentPrediction: "$currentPrediction",
                            currentPredictionPredictedOn: "$currentPredictionPredictedOn"
                        }
                    }
                }
            } 
        ], (error, resp) => {
            this._handleDatabaseResponse(error, resp, callback); 
        });
    }
    
}