var Twitter = require('twitter');
var _ = require('lodash');
var PriceService = require('./priceService');
var SentimentService = require('./sentimentService');
var AnalysisService = require('./analysisService');
var EthereumSpyDb = require('../ethereumSpyDb');
var nodeSchedule = require('node-schedule');

function DataCollectionService(coinTicker, databaseConnectionString, twitterConnectionInfo){
    this.priceService = new PriceService();
    this.sentimentService = new SentimentService();
    this.analysisService = new AnalysisService();
    this.ethereumSpyDb = new EthereumSpyDb(process.env.ETHEREUM_SPY_DATABASE_CONN);
    this.twitterClient = new Twitter({
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
        access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });
    this.coinTicker = coinTicker;
    this.prices = [];
    this.tweets = [];
    
    console.log('Data Collection initialized');
}

DataCollectionService.prototype.startDataCollection = function(){
    var self = this;
    
    nodeSchedule.scheduleJob('1 * * * * *', executeTweetVsPriceClassification.bind(self)); // for debugging
    
    nodeSchedule.scheduleJob('15 * * * * *', retrieveCoinPrice.bind(self));
    nodeSchedule.scheduleJob('45 * * * * *', retrieveCoinPrice.bind(self));
    //nodeSchedule.scheduleJob('0 0 * * * *', executeHourlyAnalysis.bind(self));
    nodeSchedule.scheduleJob('0 0 23 * * *', executeTweetVsPriceClassification.bind(self));
    
    this.twitterClient.stream('statuses/filter', {track: 'bitcoin'},  function(stream){
        console.log('Streaming Twitter...');
        stream.on('data', handleNewTweet.bind(self));
        stream.on('error', handleTwitterError.bind(self));
    });
    console.log('Data Collection started');
};

function handleNewTweet(tweet){
    var sentiment = this.sentimentService.getSentiment(tweet.text);
    var analyzedTweet = {
        text: tweet.text,
        timestamp: tweet.timestamp_ms,
        sentimentScore: sentiment
    }; 
    this.tweets.push(analyzedTweet);
    console.log('Handled new Tweet');
}

function handleTwitterError(error){
    console.log('Error while streaming Tweets: ' + error);
}

function retrieveCoinPrice(){
    console.log('Retrieving price for ' + this.coinTicker);
    this.priceService.getPrice(this.coinTicker, function(resp){
        this.prices.push({
            price: resp.price,
            timestamp: resp.timestamp,
            volume: resp.volume
        });
    }.bind(this));
}

function executeTweetVsPriceClassification(){
    this.analysisService.classifyTweetsVsPriceChange(this.prices, this.tweets);
    this.tweets = [];
    this.prices = [];
}

module.exports = DataCollectionService;