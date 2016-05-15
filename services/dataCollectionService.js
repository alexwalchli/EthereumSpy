var Twitter = require('twitter');
var _ = require('lodash');
var PriceService = require('./priceService');
var SentimentService = require('./sentimentService');
var AnalysisService = require('./analysisService');
var EthereumSpyDb = require('../ethereumSpyDb');
var nodeSchedule = require('node-schedule');

class DataCollectionService{
    constructor(coinTicker, databaseConnectionString, twitterConnectionInfo){
        this.priceService = new PriceService();
        this.sentimentService = new SentimentService();
        this.analysisService = new AnalysisService(databaseConnectionString);
        this.ethereumSpyDb = new EthereumSpyDb(databaseConnectionString);
        this.twitterClient = new Twitter(twitterConnectionInfo);
        this.coinTicker = coinTicker;
        this.prices = [];
        this.tweets = [];
        
        console.log('Data Collection initialized');
    }
    
    scheduleDataCollection(){
        nodeSchedule.scheduleJob('1 * * * * *', this._classifyDataAgainstPriceMovement.bind(this)); // for debugging
    
        nodeSchedule.scheduleJob('15 * * * * *', this._retrieveCoinPrice.bind(this));
        nodeSchedule.scheduleJob('45 * * * * *', this._retrieveCoinPrice.bind(this));
        nodeSchedule.scheduleJob('0 0,6,12,18 * * *', this._classifyDataAgainstPriceMovement.bind(this));
        
        this._startTwitterStream();
        
        console.log('Data Collection scheduled');
    }
    
    _startTwitterStream(){
        this.twitterClient.stream('statuses/filter', {track: 'bitcoin'},  function(stream){
            console.log('Streaming Twitter...');
            stream.on('data', this._onNewTweet.bind(this));
            stream.on('error', this._onTwitterError.bind(this));
        }.bind(this));
    }
    
    _onNewTweet(tweet){
        var sentiment = this.sentimentService.getSentiment(tweet.text);
        var analyzedTweet = {
            text: tweet.text,
            timestamp: tweet.timestamp_ms,
            sentimentScore: sentiment
        }; 
        this.tweets.push(analyzedTweet);
        console.log('Handled new Tweet. ' + this.tweets.length + ' in cache.');
    }
    
    _onTwitterError(error){
        console.log('Error while streaming Tweets: ' + error);
    }
    
    _retrieveCoinPrice(){
        console.log('Retrieving price for ' + this.coinTicker);
        this.priceService.getPrice(this.coinTicker, function(resp){
            this.prices.push({
                price: resp.price,
                timestamp: resp.timestamp,
                volume: resp.volume
            });
        }.bind(this));
    }
    
    _classifyDataAgainstPriceMovement(){
        this.analysisService.classifyTweetsAgainstPriceMovement(this.coinTicker, this.prices, this.tweets);
        this.tweets = [];
        this.prices = [];
    }
}

module.exports = DataCollectionService;