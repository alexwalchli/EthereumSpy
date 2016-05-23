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
            this.ethereumSpyDb.getLastPriceMovementPrediction((lastPriceMovementPrediction) => {
               var textClassifier = predictionModel ? bayes.fromJson(predictionModel.textClassifierJson)
                                                    : bayes();
                var tweetsOrderedBySentiment = _.sortBy(tweets, function(tweet){
                    return tweet.sentimentScore;
                });
                var mostCriticalTweet = tweetsOrderedBySentiment[0];
                var mostPositiveTweet = tweetsOrderedBySentiment[tweetsOrderedBySentiment.length - 1];
                var tweetCorpus = _.reduce(tweets, function(corpus, tweet){
                    return corpus + ' ' + tweet.text;
                }, '');
                var overallSentimentScore = _.reduce(tweets, function(sum, tweet){
                    return sum + tweet.sentimentScore;
                }, 0);
                var averageTweetSentiment = overallSentimentScore / tweets.length;
                
                var previousPredictionCorrect = null;
                if(lastPriceMovementPrediction){
                    previousPredictionCorrect = lastPriceMovementPrediction.prediction == priceMovement;   
                }
                
                textClassifier.learn(tweetCorpus, priceMovement);
                self.ethereumSpyDb.updatePriceMovementPredictionModel(modelName, textClassifier.toJson(), () => {
                    console.log('Price movement prediction model updated');
                });
                
                var currentPrediction = textClassifier.categorize(tweetCorpus);
                self.ethereumSpyDb.addPriceMovementPrediction({ 
                    modelName: modelName,
                    coinTicker: coinTicker,
                    timestamp: Date.now(),
                    previousPredictionCorrect: previousPredictionCorrect,
                    prediction: currentPrediction,
                    numberOfTweets: tweets.length,
                    priceMovement: priceMovement,
                    priceChange: priceChange,
                    sentimentScore: overallSentimentScore,
                    averageTweetSentiment: averageTweetSentiment,
                    mostCriticalTweet: mostCriticalTweet.text,
                    mostPositiveTweet: mostPositiveTweet.text
                }); 
            });
        });   
    }
}

module.exports = AnalysisService;