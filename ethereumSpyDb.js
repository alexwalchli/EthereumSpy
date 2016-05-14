var mongojs = require('mongojs');
var _ = require('lodash');

function EthereumSpyDb(connectionString){
    var mongojs = require('mongojs');
    this.db = mongojs(connectionString, ['analysisResults', 'priceMovementPredictionModel', 'priceMovementPredictionResults']);
    this.db.on('error', function (err) {
        console.log('database error', err);
    });

    this.db.on('connect', function () {
        console.log('database connected');
    });
}

EthereumSpyDb.prototype.getAnalysisResults = function(callback, ctx){
    this.db.analysisResults.find(function (err, analysisResults) {
        if(err){
            console.log('Error querying database: ' + err);
        } else {
            return callback.call(ctx, analysisResults);
        }
    });
};

EthereumSpyDb.prototype.saveAnalysisResults = function(saveAnalysisResults, callback, ctx){
    this.db.analysisResults.save(saveAnalysisResults, function (err) {
        if(err){
            console.log('Error querying database: ' + err);
        } else {
            return callback.call(ctx, saveAnalysisResults);
        }
    });
};

EthereumSpyDb.prototype.getPriceMovementPredictionModel = function(callback, ctx){
    this.db.priceMovementPredictionModel.findOne(function (err, pricePredictionModel) {
        if(err){
            console.log('Error querying database: ' + err);
        } else {
            return callback.call(ctx, pricePredictionModel);
        }
    });
};

EthereumSpyDb.prototype.updatePriceMovementPredictionModel = function(textClassifierJson, callback, ctx){
    var priceMovementPredictionModel = {
      textClassifierJson: textClassifierJson  
    };
    this.db.priceMovementPredictionModel.findOne(function(model){
        if(model){
            priceMovementPredictionModel._id = model._id;
        }
        this.db.analysisResults.save(priceMovementPredictionModel, function (err) {
            if(err){
                console.log('Error querying database: ' + err);
            } else {
                return callback.call(ctx);
            }
        });
    }.bind(this));
};

EthereumSpyDb.prototype.addPriceMovementPredictionResult = function(result){
    this.db.priceMovementPredictionResults.insert(result);
};

EthereumSpyDb.prototype.getPriceMovementPredictionResults = function(callback, ctx){
    this.db.priceMovementPredictionResults.find(function (err, results) {
        if(err){
            console.log('Error querying database: ' + err);
        } else {
            return callback.call(ctx, results);
        }
    });
};

EthereumSpyDb.prototype.clearDatabase = function(){
    console.log('Clearing database...');
    this.db.getCollectionNames(function(err, colNames) {
        _.forEach(colNames, function(collection_name){
            if (collection_name.indexOf("system.") == -1){
                this.db[collection_name].drop();
                console.log('Cleared ' + collection_name + ' collection');
            }
        }.bind(this));
    }.bind(this));
};

module.exports = EthereumSpyDb;



