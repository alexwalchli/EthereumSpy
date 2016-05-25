var mongojs = require('mongojs');
var _ = require('lodash');

class EthereumSpyDb{
    constructor(connectionString){
        var mongojs = require('mongojs');
        this.db = mongojs(connectionString, 
            ['priceMovementPredictionModels',
             'priceMovementPredictions',
             'analyzedTweetCache',
             'priceCache']);
        this.db.on('error', function (err) {
            console.log('database error', err);
        });

        this.db.on('connect', function () {
            console.log('database connected');
        });
    }
    
    getLastPriceMovementPrediction(callback){
        this.db.priceMovementPredictions.findOne({$query: {}, $orderby: {$natural : -1}},
            (error, resp) => { this._handleDatabaseResponse(error, resp, callback); });
    }
    
    getPriceMovementPredictionModel(modelName, callback){
        this.db.priceMovementPredictionModels.findOne({ modelName: modelName }, (error, resp) => { this._handleDatabaseResponse(error, resp, callback); });
    }
    
    upsertPriceMovementPredictionModel(coinTicker, modelName, modelLabel, textClassifierJson, callback){
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
    
    addPriceMovementPrediction(prediction){
        this.db.priceMovementPredictions.insert(prediction);
    }
    
    getPredictionsGroupedByModels(callback){
        this.db.priceMovementPredictions.aggregate([
            { $group : { _id : "$modelName", predictions: { $push: "$$ROOT" } } }
        ], (error, resp) => { this._handleDatabaseResponse(error, resp, callback); });
    }
    
    getPredictionsGroupedByCoinsThenByModels(callback){
        this.db.priceMovementPredictions.aggregate([
            { 
                $group: { 
                    _id: { coinTicker: "$coinTicker", modelName: "$modelName", modelLabel: "$modelLabel" },
                    predictionCount: { $sum: 1 },
                    correctPredictionCount: {$sum: {$cond: [{$eq: ['$predictionWasCorrect', true]}, 1, 0]}},
                    currentPrediction: { $last: "$predictionForNextInterval" },
                    currentPredictionPredictedOn : { $last: "$timestamp"}
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
                            predictionAccuracy: { $divide: ["$correctPredictionCount", "$predictionCount"] },
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
    
    updatePriceMovementPrediction(prediction){
        this.db.priceMovementPredictions.save(prediction, (error, resp) => { this._handleDatabaseResponse(error, resp); });
    }
    
    cacheAnalyzedTweets(analyzedTweets, callback){
        var bulk = this.db.analyzedTweetCache.initializeUnorderedBulkOp();
        analyzedTweets.forEach((analyzedTweet) => { bulk.insert(analyzedTweet); });
        bulk.execute((error, resp) => { this._handleDatabaseResponse(error, resp, callback); });
    }
    
    cacheAnalyzedTweet(analyzedTweet, callback){
        this.db.analyzedTweetCache.insert(analyzedTweet);
    }
    
    getAnalyzedTweetsFromCache(callback){
        this.db.analyzedTweetCache.find((error, resp) => { this._handleDatabaseResponse(error, resp, callback ); });
    }
    
    getAnalyzedTweetsFromCacheFromLastNHours(coinTicker, hours, callback){
        var ms = 60 * hours * 1000;
        var nHoursAgo = Date.now() - ms;
        this.db.analyzedTweetCache.find(
            { $and: [ { coinTicker: coinTicker }, { timestamp: {$gt:nHoursAgo}} ] 
        }, (error, resp) => { this._handleDatabaseResponse(error, resp, callback);});
    }
    
    clearAnalyzedTweetCache(){
        console.log('Clearing Analyzed Tweet Cache');
        this.db.analyzedTweetCache.drop();
    }
    
    getPricesFromCacheFromLastNHours(coinTicker, hours, callback){
        var ms = 60 * hours * 1000;
        var nHoursAgo = Date.now() - ms;
        this.db.analyzedTweetCache.find(
            { $and: [ { coinTicker: coinTicker }, { timestamp: {$gt:nHoursAgo}} ] 
        }, (error, resp) => { this._handleDatabaseResponse(error, resp, callback);});
    }
    
    cachePrice(price){
        this.db.priceCache.insert(price);
    }
    
    clearPriceCache(coinTicker){
        console.log('Clearing ' + coinTicker  + ' Price Cache');
        this.db.remove({ coinTicker: coinTicker }, false);
    }
    
    clearDatabase(){
        console.log('Clearing database...');
        this.db.getCollectionNames((err, colNames) => {
            _.forEach(colNames, (collection_name) => {
                if (collection_name.indexOf("system.") == -1){
                    if(this.db[collection_name]){
                        this.db[collection_name].drop();
                        console.log('Cleared ' + collection_name + ' collection');   
                    }
                }
            });
        });
    }
    
    _handleDatabaseResponse(error, resp, callback){
        if(error){
            console.log('Error querying database: ' + error);
        } else if(callback) {
            return callback(resp);
        }
    }
}

module.exports = EthereumSpyDb;



