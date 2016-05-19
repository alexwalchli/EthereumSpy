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
        this.twitterClients = {};
        this.twitterConnTimeouts = {};
        this.coinsTrackingInfo = coinsTrackingInfo;
        this.tweets = [];
        
        console.log('Data Collection initialized');
    }
    
    scheduleDataCollection(){

        // every 45 seconds
        nodeSchedule.scheduleJob('45 * * * * *', () => { this._retrieveCoinPrices(); });
        
        this.coinsTrackingInfo.forEach((coin) => {
            nodeSchedule.scheduleJob('1 * * * * *', () => { this._classifyDataAgainstPriceMovement(coin.ticker, 'tweets-' + coin.ticker + '-debugging', 1); }); // for debugging
            
            // every 6 hours
            nodeSchedule.scheduleJob('0 0,6,12,18 * * *', () => { this._classifyDataAgainstPriceMovement(coin.ticker,'tweets-' + coin.ticker + '-every-6hrs', 6); });
            
            // every 12 hours
            nodeSchedule.scheduleJob('0 10,22 * * *', () => { this._classifyDataAgainstPriceMovement(coin.ticker, 'tweets-' + coin.ticker + '-every-12hrs', 12); });
            
            // every day
            nodeSchedule.scheduleJob('0 13 * * *', () => { this._classifyDataAgainstPriceMovement(coin.ticker,'tweets-' + coin.ticker + '-every-24hrs', 24); }); 
        });
        
        // clear the cache everyday
        nodeSchedule.scheduleJob('0 23 * * *', () => { this._clearDataCache(); });
        
        this._startTwitterStreams();
        
        console.log('Data Collection scheduled');
    }
    
    _startTwitterStreams(){
        // starting more than 1 stream at the same time results in a 420, Enhance your calm
        for (let i=0; i< this.coinsTrackingInfo.length; i++) {
            let coin = this.coinsTrackingInfo[i];
            setTimeout(() => {
                this._restartTwitter(coin);   
            }, i*5000 );
        }
    }
    
    _startTwitterStream(coin){
        var self = this;
        this._resetTwitterTimeout(coin);
        this.twitterClients[coin.ticker].stream('statuses/filter', {track: coin.phrase}, 
            (stream) => {
                console.log('Streaming Twitter with phrase: ' + coin.phrase);
                stream.on('data', (tweet) => { self._onNewTweet(coin, tweet); });
                stream.on('error', (tweet) => { self._onTwitterError(coin, tweet); });
            });
    }
    
    _onNewTweet(coin, tweet){
        this._resetTwitterTimeout(coin);
        var sentiment = this.sentimentService.getSentiment(tweet.text);
        var analyzedTweet = {
            coinTicker: coin.ticker,
            text: tweet.text,
            timestamp: tweet.timestamp_ms,
            sentimentScore: sentiment
        }; 
        this._cacheAnalyzedTweet(analyzedTweet);
        console.log('Handled new Tweet.');
    }
    
    _resetTwitterTimeout(coin){
        if(this.twitterConnTimeouts[coin.ticker]){
            clearTimeout(this.twitterConnTimeouts[coin.ticker]);
        }
        
        this.twitterConnTimeouts[coin.ticker] = setTimeout(() => { this._restartTwitter(coin); }, 60000);
    }
    
    _restartTwitter(coin){
        console.log('Initializing Twitter connection for coin ' + coin.ticker + '...');
        this.twitterClients[coin.ticker] = new Twitter(this.twitterConnectionInfo);
        this._startTwitterStream(coin);
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
    
    _onTwitterError(coin, error){
        console.log('Error while streaming Tweets for ' + coin.ticker + ': ' + error);
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
            self.ethereumSpyDb.getPrices(coinTicker, (prices) => {
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