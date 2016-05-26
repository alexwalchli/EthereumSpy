var _ = require('lodash');
var bayes = require('bayes');
var EthereumSpyDb = require('../ethereumSpyDb');

class AnalysisService{
    constructor(databaseConnectionString){
        this.ethereumSpyDb = new EthereumSpyDb(databaseConnectionString);
    }
    
    classifyTweetsAgainstPriceMovement(modelName, modelLabel, coinTicker, prices, tweets){
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
                
                if(lastPriceMovementPrediction){
                    lastPriceMovementPrediction.predictionWasCorrect = lastPriceMovementPrediction.prediction == priceMovement;
                    lastPriceMovementPrediction.numberOfTweets = tweets.length;
                    lastPriceMovementPrediction.priceMovement = priceMovement;
                    lastPriceMovementPrediction.priceChange = priceChange;
                    lastPriceMovementPrediction.sentimentScore = overallSentimentScore;
                    lastPriceMovementPrediction.averageTweetSentiment = averageTweetSentiment;
                    lastPriceMovementPrediction.mostCriticalTweet = mostCriticalTweet.text;
                    lastPriceMovementPrediction.mostPositiveTweet = mostPositiveTweet.text;
                    lastPriceMovementPrediction.status = 'complete';
                    self.ethereumSpyDb.updatePriceMovementPrediction(lastPriceMovementPrediction);  
                }
                
                textClassifier.learn(tweetCorpus, priceMovement);
                self.ethereumSpyDb.upsertPriceMovementPredictionModel(coinTicker, modelName, modelLabel, textClassifier.toJson(), () => {
                    console.log('Price movement prediction model updated');
                });
                
                var prediction = textClassifier.categorize(tweetCorpus);
                self.ethereumSpyDb.addPriceMovementPrediction({ 
                    modelName: modelName,
                    modelLabel: modelLabel,
                    coinTicker: coinTicker,
                    timestamp: Date.now(),
                    unixTimestamp: Math.floor(Date.now() / 1000),
                    prediction: prediction,
                    status: 'waiting_for_result'
                }); 
            });
        });   
    }
}

module.exports = AnalysisService;