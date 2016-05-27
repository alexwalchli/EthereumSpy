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
}