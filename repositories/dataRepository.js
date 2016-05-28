const mongojs = require('mongojs'); 

class DataRepository {
    constructor(databaseConnectionString){
        var mongojs = require('mongojs');
        this.db = mongojs(databaseConnectionString, 
            ['priceMovementPredictionModels',
             'priceMovementPredictions',
             'analyzedTweetCache',
             'priceCache']);
             
        this.db.on('error', function (err) {
            console.log('Database error', err);
        });

        this.db.on('connect', function () {
            console.log('Database connected');
        });
    }
    
    handleDatabaseResponse(error, resp, callback){
        if(error){
            console.log('Error querying database: ' + error);
        } else if(callback) {
            return callback(resp);
        }
    }
}

module.exports = DataRepository;