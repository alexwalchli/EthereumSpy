const _ = require('lodash');
const PriceStream = require('./priceStream');
const AnalysisService = require('./analysisService');
const nodeSchedule = require('node-schedule');
const TwitterStream = require('./twitterStream');

class DataCollectionService{
    constructor(coinsTrackingInfo, twitterConnectionInfo, ethereumSpyDb){
        this.priceStream = new PriceStream(coinsTrackingInfo, ethereumSpyDb);
        this.analysisService = new AnalysisService(ethereumSpyDb);
        this.ethereumSpyDb = ethereumSpyDb;
        this.twitterConnectionInfo = twitterConnectionInfo;
        this.coinsTrackingInfo = coinsTrackingInfo;
        this.twitterStream = new TwitterStream(twitterConnectionInfo, coinsTrackingInfo, ethereumSpyDb);
        
        console.log('Data Collection initialized');
    }
    
    scheduleDataCollection(){
        this.coinsTrackingInfo.forEach((coin) => {
            if(process.env.NODE_ENV == 'development'){
                nodeSchedule.scheduleJob('1 * * * * *', () => { 
                    this._classifyDataAgainstPriceMovement(coin.ticker, 'tweet-classification-' + coin.ticker + '-debugging', '1 min debug prediction', 1); 
                });
            }
            
            // hourly
            nodeSchedule.scheduleJob('0 * * * *', () => { 
                this._classifyDataAgainstPriceMovement(coin.ticker,'tweet-classification-' + coin.ticker + '-every-hour', 'Hourly prediction', 1); 
            });
            
            // every 6 hours
            nodeSchedule.scheduleJob('0 0,6,12,18 * * *', () => { 
                this._classifyDataAgainstPriceMovement(coin.ticker,'tweet-classification-' + coin.ticker + '-every-6hrs', '6 hour prediction', 6); 
            });
            
            // every 12 hours
            nodeSchedule.scheduleJob('0 10,22 * * *', () => { 
                this._classifyDataAgainstPriceMovement(coin.ticker, 'tweet-classification-' + coin.ticker + '-every-12hrs', '12 hour prediction', 12);
            });
            
            // every day
            nodeSchedule.scheduleJob('0 13 * * *', () => { 
                this._classifyDataAgainstPriceMovement(coin.ticker,'tweet-classification-' + coin.ticker + '-every-24hrs', 'Daily prediction', 24); 
            }); 
        });
        
        // clear the cache everyday
        nodeSchedule.scheduleJob('0 23 * * *', () => { this._clearDataCache(); });
        
        this.twitterStream.start();
        this.priceStream.schedule('45 * * * * *');
        
        console.log('Data Collection scheduled');
    }
    
    _classifyDataAgainstPriceMovement(coinTicker, modelName, modelLabel, hoursOfData){
        var self = this;
        this.ethereumSpyDb.getAnalyzedTweetsFromCacheFromLastNHours(coinTicker, hoursOfData, (analyzedTweets) => {
            self.ethereumSpyDb.getPricesFromCacheFromLastNHours(coinTicker, hoursOfData, (prices) => {
                self.analysisService.classifyTweetsAgainstPriceMovement(modelName, modelLabel, coinTicker, prices, analyzedTweets); 
            });
        });
    }
    
    _clearDataCache(){
        this.ethereumSpyDb.clearAnalyzedTweetCache();
        this.ethereumSpyDb.clearPriceCache();
    }
}

module.exports = DataCollectionService;