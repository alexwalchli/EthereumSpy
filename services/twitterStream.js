const Twitter = require('twitter');
const EventEmitter = require('events');
const SentimentService = require('./sentimentService');
const TwitterConnectionInfo = require('../twitterConnectionInfo');
const CoinsTrackingInfo = require('../coinsTrackingInfo');

class TwitterStream{
    
    constructor(ethereumSpyDb){
        this.ethereumSpyDb = ethereumSpyDb;
        this.sentimentService = new SentimentService();
        this.twitterClient;
        this.twitterConnTimeout;
        this.tweets = [];
    }
    
    start(){
        console.log('Initializing Twitter connection...');
        this.twitterClient = new Twitter(TwitterConnectionInfo);
        var terms = [];
        CoinsTrackingInfo.map((coin) => { terms.push(coin.phrase); });
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
        
        CoinsTrackingInfo.forEach((coin) => {
           if(tweet.text.toLowerCase().indexOf(coin.phrase.toLowerCase()) > -1){
                var analyzedTweet = {
                    coinTicker: coin.ticker,
                    text: tweet.text,
                    timestamp: parseInt(tweet.timestamp_ms),
                    sentimentScore: sentiment
                }; 
                this._cacheAnalyzedTweet(analyzedTweet);
           }
        });
    }
    
    _resetTwitterTimeout(){
        if(this.twitterConnTimeout){
            clearTimeout(this.twitterConnTimeout);
        }
        this.twitterConnTimeout = setTimeout(() => { this.start(); }, 60000);
    }
    
    // bulk insert 50 tweets at a time
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
}

module.exports = TwitterStream;