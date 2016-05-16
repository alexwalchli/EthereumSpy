var _ = require('lodash');
var bayes = require('bayes');
var EthereumSpyDb = require('../ethereumSpyDb');

class AnalysisService{
    constructor(databaseConnectionString){
        this.ethereumSpyDb = new EthereumSpyDb(databaseConnectionString);
    }
    
    classifyTweetsAgainstPriceMovement(coinTicker, prices, tweets){
        console.log('Running price movement classification on ' + coinTicker + ' with ' + tweets.length + ' tweets and ' + prices.length + ' prices');
        if(!tweets || tweets.length === 0 || !prices || prices.length === 0){
            console.log('Skipping analysis, no Tweets or Prices');
            return;
        }
        
        var startingPrice = prices[0];
        var endingPrice = prices[prices.length - 1];
        var priceChange = endingPrice.price - startingPrice.price;
        var priceMovement = priceChange > 0 ? 'positive' : 'negative';
        
        this.ethereumSpyDb.getPriceMovementPredictionModel(function(predictionModel){
            var textClassifier = predictionModel ? bayes.fromJson(predictionModel.textClassifierJson)
                                                : bayes();
            var sentimentOrderedTweets = _.sortBy(tweets, function(tweet){
                return tweet.sentimentScore;
            });
            var mostCriticalTweet = sentimentOrderedTweets[0];
            var mostPositiveTweet = sentimentOrderedTweets[sentimentOrderedTweets.length - 1];
            var todaysTweetCorpus = _.reduce(tweets, function(corpus, tweet){
                return corpus + ' ' + tweet.text;
            }, '');
            var overallSentimentScore = _.reduce(tweets, function(sum, tweet){
                return sum + tweet.sentimentScore;
            }, 0);
            
            // back test against yesterday's prediction model
            var testResult = textClassifier.categorize(todaysTweetCorpus);
            var modelPredictedCorrectly = testResult == priceMovement;
            if(modelPredictedCorrectly){
                console.log('Price movement prediction model categorized correctly');
            } else {
                console.log('Price movement prediction model categorized incorrectly'); 
            }
            
            this.ethereumSpyDb.addPriceMovementPredictionResult({ 
                timestamp: Date.now(),
                predictedCorrectly: modelPredictedCorrectly,
                numberOfTweets: tweets.length,
                priceMovement: priceMovement,
                sentimentScore: overallSentimentScore
            });
            
            textClassifier.learn(todaysTweetCorpus, priceChange);
            this.ethereumSpyDb.updatePriceMovementPredictionModel(textClassifier.toJson(), function(){
                console.log('Price movement prediction model updated');
            });
        }, this);   
    }
}

module.exports = AnalysisService;