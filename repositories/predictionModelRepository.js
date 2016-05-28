
class PredictionModelRepository extends DataRepository{
    
    constructor(databaseConnectionString){
        super(databaseConnectionString);
    }
    
    getByModelName(modelName, callback){
        this.db.priceMovementPredictionModels.findOne({ modelName: modelName }, (error, resp) => { this._handleDatabaseResponse(error, resp, callback); });
    }
    
    upsert(coinTicker, modelName, modelLabel, textClassifierJson, callback){
        var priceMovementPredictionModel = {
            coinTicker: coinTicker,
            modelName: modelName,
            modelLabel: modelLabel,
            textClassifierJson: textClassifierJson  
        };
        this.db.priceMovementPredictionModels.findOne({ modelName: modelName }, (error, model) => {
            if(model){
                priceMovementPredictionModel._id = model._id;
            }
            this.db.priceMovementPredictionModels.save(priceMovementPredictionModel, (error, resp) => { this._handleDatabaseResponse(error, resp, callback); });
        });
    }
    
}