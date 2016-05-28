const DataRepository = require('./dataRepository');

class PriceCacheRepository extends DataRepository{
    constructor(databaseConnectionString){
        super(databaseConnectionString);
    }
    
    cache(price){
        this.db.priceCache.insert(price);
    }
    
    getFromLastNHours(coinTicker, hours, callback){
        var ms = 1000*3600*hours;
        var nHoursAgo = Date.now() - ms;
        this.db.priceCache.find(
            { $and: [ { coinTicker: coinTicker }, { timestamp: {$gt:nHoursAgo}} ] 
        }).sort({ timestamp: 1}, (error, resp) => { this._handleDatabaseResponse(error, resp, callback);});
    }
    
    evict(coinTicker){
        console.log('Evicting entire ' + coinTicker  + ' Price Cache');
        this.db.priceCache.drop();
    }
}

module.exports = PriceCacheRepository;