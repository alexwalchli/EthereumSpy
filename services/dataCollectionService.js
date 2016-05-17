var Twitter = require('twitter');
var _ = require('lodash');
var PriceService = require('./priceService');
var SentimentService = require('./sentimentService');
var AnalysisService = require('./analysisService');
var EthereumSpyDb = require('../ethereumSpyDb');
var nodeSchedule = require('node-schedule');

// class DataCollectionService{
//     constructor(coinTicker, databaseConnectionString, twitterConnectionInfo){
//         this.priceService = new PriceService();
//         this.sentimentService = new SentimentService();
//         this.analysisService = new AnalysisService(databaseConnectionString);
//         this.ethereumSpyDb = new EthereumSpyDb(databaseConnectionString);
//         this.twitterConnectionInfo = twitterConnectionInfo;
//         this.twitterClient = new Twitter(this.twitterConnectionInfo);
//         this.twitterConnTimeout;
//         this.coinTicker = coinTicker;
//         this.tweets = [];
        
        
        
//         console.log('Data Collection initialized');
//     }
    
//     scheduleDataCollection(){
//         nodeSchedule.scheduleJob('1 * * * * *', () => { this._classifyDataAgainstPriceMovement('tweets-btc-debugging'); }); // for debugging

//         // every 45 seconds
//         nodeSchedule.scheduleJob('45 * * * * *', () => { this._retrieveCoinPrice(); });
        
//         // every 6 hours
//         nodeSchedule.scheduleJob('0 0,6,12,18 * * *', () => { this._classifyDataAgainstPriceMovement('tweets-btc-every-6hrs'); });
        
//         // every 12 hours
//         nodeSchedule.scheduleJob('0 11,23 * * *', () => { this._classifyDataAgainstPriceMovement('tweets-btc-every-12hrs'); });
        
//         // every day
//         nodeSchedule.scheduleJob('0 23 * * *', () => { this._classifyDataAgainstPriceMovement('tweets-btc-every-24hrs', true); });
        
//         this._startTwitterStream();
        
//         console.log('Data Collection scheduled');
//     }
    
//     _startTwitterStream(){
//         this._resetTwitterTimeout();
//         this.twitterClient.stream('statuses/filter', {track: 'bitcoin'}, 
//             (stream) => {
//                 console.log('Streaming Twitter...');
//                 stream.on('data', this._onNewTweet.bind(this));
//                 stream.on('error', this._onTwitterError.bind(this));
//             });
//     }
    
//     _onNewTweet(tweet){
//         this._resetTwitterTimeout();
//         var sentiment = this.sentimentService.getSentiment(tweet.text);
//         var analyzedTweet = {
//             text: tweet.text,
//             timestamp: tweet.timestamp_ms,
//             sentimentScore: sentiment
//         }; 
//         this._cacheAnalyzedTweet(analyzedTweet);
//         console.log('Handled new Tweet.');
//     }
    
//     _resetTwitterTimeout(){
//         if(this.twitterConnTimeout){
//             clearTimeout(this.twitterConnTimeout);
//         }
        
//         this.twitterConnTimeout = setTimeout(() => { this._restartTwitter(); }, 60000);
//     }
    
//     _restartTwitter(){
//         console.log('Twitter connection dropped after 60secs, restarting...');
//         this.twitterClient = new Twitter(this.twitterConnectionInfo);
//         this._startTwitterStream();
//     }
    
//     _cacheAnalyzedTweet(analyzedTweet){
//         this.tweets.push(analyzedTweet);
        
//         if(this.tweets.length > 10){
//             var firstTenTweets = this.tweets.slice(0, 10);
//             this.tweets.splice.call(this.tweets, 0, 10);
//             this.ethereumSpyDb.cacheAnalyzedTweets(firstTenTweets, () => {
//                console.log('Cached 10 tweets');
//             });
//         }
//     }
    
//     _onTwitterError(error){
//         console.log('Error while streaming Tweets: ' + error);
//     }
    
//     _retrieveCoinPrice(){
//         console.log('Retrieving price for ' + this.coinTicker);
//         var self = this;
//         this.priceService.getPrice(this.coinTicker, (price) => { self.ethereumSpyDb.cachePrice(price); });
//     }
    
//     _classifyDataAgainstPriceMovement(modelName, clearCache){
//         var self = this;
//         this.ethereumSpyDb.getAnalyzedTweetsFromCache((analyzedTweets) => {
//             self.ethereumSpyDb.getPrices(self.coinTicker, (prices) => {
//                self.analysisService.classifyTweetsAgainstPriceMovement(modelName, self.coinTicker, prices, analyzedTweets); 
//             });
//         });
        
//         if(clearCache){
//             this.ethereumSpyDb.clearAnalyzedTweetCache();
//             this.ethereumSpyDb.clearPriceCache();
//         }
//     }
// }

// module.exports = DataCollectionService;