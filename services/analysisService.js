var _ = require('lodash');
var bayes = require('bayes');
var EthereumSpyDb = require('../ethereumSpyDb');

class AnalysisService{
    constructor(databaseConnectionString){
        this.ethereumSpyDb = new EthereumSpyDb(databaseConnectionString);
    }
    
    classifyTweetsAgainstPriceMovement(modelName, coinTicker, prices, tweets){
        console.log('Running ' + modelName + ' for ' + coinTicker + ' price prediction');
        if(!tweets || tweets.length === 0 || !prices || prices.length === 0){
            console.log('Skipping analysis, no Tweets or Prices');
            return;
        }
        console.log('Details: ' + coinTicker + ' with ' + tweets.length + ' tweets and ' + prices.length + ' prices');
        
        var startingPrice = prices[0];
        var endingPrice = prices[prices.length - 1];
        var priceChange = endingPrice.price - startingPrice.price;
        var priceMovement = priceChange > 0 ? 'positive' : 'negative';
        var self = this;
       
        this.ethereumSpyDb.getPriceMovementPredictionModel(modelName, (predictionModel) => {
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
            var averageTweetSentiment = overallSentimentScore / tweets.length;
            
            // back test against yesterday's prediction model
            var testResult = textClassifier.categorize(todaysTweetCorpus);
            var modelPredictedCorrectly = testResult == priceMovement;
            if(modelPredictedCorrectly){
                console.log('Price movement prediction model categorized correctly');
            } else {
                console.log('Price movement prediction model categorized incorrectly'); 
            }
            
            self.ethereumSpyDb.addPriceMovementPredictionResult({ 
                modelName: modelName,
                coinTicker: coinTicker,
                timestamp: Date.now(),
                predictedCorrectly: modelPredictedCorrectly,
                numberOfTweets: tweets.length,
                priceMovement: priceMovement,
                priceChange: priceChange,
                sentimentScore: overallSentimentScore,
                averageTweetSentiment: averageTweetSentiment,
                mostCriticalTweet: mostCriticalTweet.text,
                mostPositiveTweet: mostPositiveTweet.text
            });
            
            textClassifier.learn(todaysTweetCorpus, priceChange);
            self.ethereumSpyDb.updatePriceMovementPredictionModel(modelName, textClassifier.toJson(), () => {
                console.log('Price movement prediction model updated');
            });
        }, this);   
    }
}

module.exports = AnalysisService;