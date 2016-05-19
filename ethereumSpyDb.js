var mongojs = require('mongojs');
var _ = require('lodash');

class EthereumSpyDb{
    constructor(connectionString){
        var mongojs = require('mongojs');
        this.db = mongojs(connectionString, 
            ['analysisResults', 
             'priceMovementPredictionModel',
             'priceMovementPredictionResults',
             'analyzedTweetCache',
             'priceCache']);
        this.db.on('error', function (err) {
            console.log('database error', err);
        });

        this.db.on('connect', function () {
            console.log('database connected');
        });
    }
    
    getAnalysisResults(callback){
        this.db.analysisResults.find((error, resp) => { this._handleDatabaseResponse(error, resp, callback); });
    }
    
    saveAnalysisResults(saveAnalysisResults, callback){
        this.db.analysisResults.save(saveAnalysisResults, (error, resp) => { this._handleDatabaseResponse(error, resp, callback); });
    }
    
    getPriceMovementPredictionModel(modelName, callback){
        this.db.priceMovementPredictionModel.findOne({ modelName: modelName }, (error, resp) => { this._handleDatabaseResponse(error, resp, callback); });
    }
    
    updatePriceMovementPredictionModel(modelName, textClassifierJson, callback){
        var priceMovementPredictionModel = {
            modelName: modelName,
            textClassifierJson: textClassifierJson  
        };
        this.db.priceMovementPredictionModel.findOne({ modelName: modelName }, (model) => {
            if(model){
                priceMovementPredictionModel._id = model._id;
            }
            this.db.analysisResults.save(priceMovementPredictionModel, (error, resp) => { this._handleDatabaseResponse(error, resp, callback); });
        });
    }
    
    addPriceMovementPredictionResult(result){
        this.db.priceMovementPredictionResults.insert(result);
    }
    
    getPriceMovementPredictionResults(callback){
        this.db.priceMovementPredictionResults.find((error, resp) => { this._handleDatabaseResponse(error, resp, callback); });
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
        this.db.analyzedTweetCache.find({ coinTicker: coinTicker, "dt":{$gt:nHoursAgo}},
                                         (error, resp) => { this._handleDatabaseResponse(error, resp, callback);});
    }
    
    clearAnalyzedTweetCache(){
        console.log('Clearing Analyzed Tweet Cache');
        this.db.analyzedTweetCache.drop();
    }
    
    getPrices(coinTicker, callback){
        this.db.priceCache.find({ coinTicker: coinTicker}, (error, prices) => { this._handleDatabaseResponse(error, prices, callback); });
    }
    
    cachePrice(price){
        this.db.priceCache.insert(price);
    }
    
    clearPriceCache(coinTicker){
        console.log('Clearing Price Cache');
        this.db.remove({ coinTicker: coinTicker }, false);
    }
    
    clearDatabase(){
        console.log('Clearing database...');
        this.db.getCollectionNames((err, colNames) => {
            _.forEach(colNames, (collection_name) => {
                if (collection_name.indexOf("system.") == -1){
                    this.db[collection_name].drop();
                    console.log('Cleared ' + collection_name + ' collection');
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



