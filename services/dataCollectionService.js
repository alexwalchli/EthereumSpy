var Twitter = require('twitter');
var _ = require('lodash');
var PriceService = require('./priceService');
var SentimentService = require('./sentimentService');
var AnalysisService = require('./analysisService');
var EthereumSpyDb = require('../ethereumSpyDb');
var nodeSchedule = require('node-schedule');

class DataCollectionService{
    constructor(coinsTrackingInfo, databaseConnectionString, twitterConnectionInfo){
        this.priceService = new PriceService();
        this.sentimentService = new SentimentService();
        this.analysisService = new AnalysisService(databaseConnectionString);
        this.ethereumSpyDb = new EthereumSpyDb(databaseConnectionString);
        this.twitterConnectionInfo = twitterConnectionInfo;
        this.twitterClient;
        this.twitterConnTimeout;
        this.coinsTrackingInfo = coinsTrackingInfo;
        this.tweets = [];
        
        console.log('Data Collection initialized');
    }
    
    scheduleDataCollection(){
        // every 45 seconds
        nodeSchedule.scheduleJob('45 * * * * *', () => { this._retrieveCoinPrices(); });
        
        this.coinsTrackingInfo.forEach((coin) => {
            if(process.env.NODE_ENV == 'development' && process.env.CLEAR_DB_ON_START){
                nodeSchedule.scheduleJob('1 * * * * *', () => { this._classifyDataAgainstPriceMovement(coin.ticker, 'tweets-' + coin.ticker + '-debugging', 1); }); // for debugging
            }
            // every 6 hours
            nodeSchedule.scheduleJob('0 0,6,12,18 * * *', () => { this._classifyDataAgainstPriceMovement(coin.ticker,'tweets-' + coin.ticker + '-every-6hrs', 6); });
            
            // every 12 hours
            nodeSchedule.scheduleJob('0 10,22 * * *', () => { this._classifyDataAgainstPriceMovement(coin.ticker, 'tweets-' + coin.ticker + '-every-12hrs', 12); });
            
            // every day
            nodeSchedule.scheduleJob('0 13 * * *', () => { this._classifyDataAgainstPriceMovement(coin.ticker,'tweets-' + coin.ticker + '-every-24hrs', 24); }); 
        });
        
        // clear the cache everyday
        nodeSchedule.scheduleJob('0 23 * * *', () => { this._clearDataCache(); });
        
        this._startTwitterStream();
        
        console.log('Data Collection scheduled');
    }
    
    _startTwitterStream(){
        console.log('Initializing Twitter connection...');
        this.twitterClient = new Twitter(this.twitterConnectionInfo);
        var terms = [];
        this.coinsTrackingInfo.forEach((coin) => { terms.push(coin.phrase); });
        var phrase = terms.join(',');
        var self = this;
        this._resetTwitterTimeout();
        this.twitterClient.stream('statuses/filter', {track: phrase}, 
            (stream) => {
                console.log('Streaming Twitter with phrase: ' + phrase);
                stream.on('data', (tweet) => { self._onNewTweet(tweet); });
                stream.on('error', (tweet) => { self._onTwitterError(tweet); });
            });
    }
    
    _onNewTweet(tweet){
        this._resetTwitterTimeout();
        var sentiment = this.sentimentService.getSentiment(tweet.text);
        
        this.coinsTrackingInfo.forEach((coin) => {
           if(tweet.text.toLowerCase().indexOf(coin.phrase.toLowerCase()) > -1){
                var analyzedTweet = {
                    coinTicker: coin.ticker,
                    text: tweet.text,
                    timestamp: parseInt(tweet.timestamp_ms),
                    sentimentScore: sentiment
                }; 
                this._cacheAnalyzedTweet(analyzedTweet);
                console.log('Handled new "' + coin.ticker + '" Tweet.');
           }
        });
    }
    
    _resetTwitterTimeout(){
        if(this.twitterConnTimeout){
            clearTimeout(this.twitterConnTimeout);
        }
        this.twitterConnTimeout = setTimeout(() => { this._startTwitterStream(); }, 60000);
    }
    
    _cacheAnalyzedTweet(analyzedTweet){
        this.tweets.push(analyzedTweet);
        
        var bulkInsertAmount = 50;
        if(this.tweets.length > bulkInsertAmount){
            var firstNTweets = this.tweets.slice(0, bulkInsertAmount);
            this.tweets.splice.call(this.tweets, 0, bulkInsertAmount);
            this.ethereumSpyDb.cacheAnalyzedTweets(firstNTweets, () => {
               console.log('Cached ' + bulkInsertAmount + ' tweets');
            });
        }
    }
    
    _onTwitterError(error){
        console.log('Error while streaming Tweets: ' + error);
    }
    
    _retrieveCoinPrices(){
        this.coinsTrackingInfo.forEach((coin) => {
            console.log('Retrieving price for ' + coin.ticker);
            var self = this;
            this.priceService.getPrice(coin.ticker, (price) => { self.ethereumSpyDb.cachePrice(price); }); 
        });
    }
    
    _classifyDataAgainstPriceMovement(coinTicker, modelName, hoursOfData){
        var self = this;
        this.ethereumSpyDb.getAnalyzedTweetsFromCacheFromLastNHours(coinTicker, hoursOfData, (analyzedTweets) => {
            self.ethereumSpyDb.getPricesFromCacheFromLastNHours(coinTicker, hoursOfData, (prices) => {
                self.analysisService.classifyTweetsAgainstPriceMovement(modelName, coinTicker, prices, analyzedTweets); 
            });
        });
    }
    
    _clearDataCache(){
        this.ethereumSpyDb.clearAnalyzedTweetCache();
        this.ethereumSpyDb.clearPriceCache();
    }
}

module.exports = DataCollectionService;