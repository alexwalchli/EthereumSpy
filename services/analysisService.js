const _ = require('lodash');
const bayes = require('bayes');
const EthereumSpyDb = require('../ethereumSpyDb');
const PriceService = require('./priceService');

class AnalysisService{
    constructor(ethereumSpyDb){
        this.ethereumSpyDb = ethereumSpyDb;
        this.priceService = new PriceService();
    }
    
    classifyTweetsAgainstPriceMovement(modelName, modelLabel, coinTicker, prices, tweets){
        console.log('Running ' + modelName + ' for ' + coinTicker + ' price prediction');
        if(!tweets || tweets.length === 0){
            console.log('Skipping analysis, no Tweets');
            return;
        }
        console.log('Details: ' + coinTicker + ' with ' + tweets.length + ' tweets and ' + prices.length + ' prices');
        var self = this;
        this.priceService.getPrice(coinTicker, (currentPrice) => {
            self.ethereumSpyDb.getPriceMovementPredictionModel(modelName, (predictionModel) => {
                self.ethereumSpyDb.getLastPriceMovementPrediction(modelName, (lastPrediction) => {
                    if(!lastPrediction){
                        // bootstrap predictions and a starting price
                        self.ethereumSpyDb.addPriceMovementPrediction({
                            modelName: modelName,
                            modelLabel: modelLabel,
                            coinTicker: coinTicker,
                            timestamp: Date.now(),
                            unixTimestamp: Math.floor(Date.now() / 1000),
                            status: 'bootstrap',
                            beginningPrice: currentPrice.price,
                        });  
                        
                        return;
                    }
                    
                    var textClassifier = predictionModel ? bayes.fromJson(predictionModel.textClassifierJson)
                                                            : bayes();
                                                    
                    var tweetCorpus = _.reduce(tweets, function(corpus, tweet){
                        return corpus + ' ' + tweet.text;
                    }, '');
                    var tweetsOrderedBySentiment = _.sortBy(tweets, function(tweet){
                        return tweet.sentimentScore;
                    });
                    var mostCriticalTweet = tweetsOrderedBySentiment[0];
                    var mostPositiveTweet = tweetsOrderedBySentiment[tweetsOrderedBySentiment.length - 1];
                    
                    var overallSentimentScore = _.reduce(tweets, function(sum, tweet){
                        return sum + tweet.sentimentScore;
                    }, 0);
                    var averageTweetSentiment = overallSentimentScore / tweets.length;
                    
                    var priceChange = currentPrice.price - lastPrediction.beginningPrice;
                    var priceMovementLabel = priceChange > 0 ? 'positive' : 'negative';
                    
                    lastPrediction.predictionWasCorrect = lastPrediction.prediction == priceMovementLabel;
                    lastPrediction.numberOfTweets = tweets.length;
                    lastPrediction.priceMovement = priceMovementLabel;
                    lastPrediction.priceChange = priceChange;
                    lastPrediction.endingPrice = currentPrice.price;
                    lastPrediction.sentimentScore = overallSentimentScore;
                    lastPrediction.averageTweetSentiment = averageTweetSentiment;
                    lastPrediction.mostCriticalTweet = mostCriticalTweet.text;
                    lastPrediction.mostPositiveTweet = mostPositiveTweet.text;
                    lastPrediction.status = 'complete';
                    self.ethereumSpyDb.updatePriceMovementPrediction(lastPrediction);
                    
                    textClassifier.learn(tweetCorpus, priceMovementLabel);
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
                        status: 'waiting_for_result',
                        beginningPrice: currentPrice.price,
                    });
                });
            });    
        });  
    }
}

module.exports = AnalysisService;