const request = require('request');
const nodeSchedule = require('node-schedule');

class PriceStream{
    
    constructor(coinsTrackingInfo, ethereumSpyDb){
        this.coinsTrackingInfo = coinsTrackingInfo;
        this.ethereumSpyDb = ethereumSpyDb;
    }
    
    schedule(schedule){
        // every 45 seconds
        nodeSchedule.scheduleJob(schedule, () => { this._retrieveAllCoinPrices(); });
    }
    
    _retrieveAllCoinPrices(){
        this.coinsTrackingInfo.forEach((coin) => {
            console.log('Retrieving price for ' + coin.ticker);
            this._getAndCacheCoinPrice(coin.ticker); 
        });
    }
    
    _getAndCacheCoinPrice(coinTicker, callback){
        request('https://www.cryptonator.com/api/ticker/' + coinTicker + '-usd', (error, response, body) => {
            if (!error && response.statusCode == 200) {
                console.log(body);
                var responseObj = JSON.parse(body);
                this._cachePrice({
                    coinTicker: responseObj.ticker.base,
                    price: responseObj.ticker.price,
                    volume: responseObj.volume,
                    change: responseObj.change,
                    timestamp: responseObj.timestamp * 1000 // convert to ms
                });
            }
        });
    }
    
    _cachePrice(price){
        this.ethereumSpyDb.cachePrice(price);
    }
}

module.exports = PriceStream;