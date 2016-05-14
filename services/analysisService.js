var _ = require('lodash');
var bayes = require('bayes');
var EthereumSpyDb = require('../ethereumSpyDb');

function AnalysisService(){
    this.ethereumSpyDb = new EthereumSpyDb('mongodb://ethereumspy:3th3r3umspy1988@ds034279.mlab.com:34279/ethereumspy');
}

AnalysisService.prototype.analyzeSentiment = function(prices, tweets){
    // TODO:
};

AnalysisService.prototype.classifyTweetsVsPriceChange = function(coinTicker, prices, tweets){
    console.log('Running price movement classification on ' + coinTicker + ' with ' + tweets.length + ' tweets and ' + prices.length + ' prices');
    if(!tweets || tweets.length === 0 || !prices || prices.length === 0){
        console.log('Skipping analysis, no Tweets or Prices');
        return;
    }
    
    var self = this;
    var startingPrice = prices[0];
    var endingPrice = prices[prices.length - 1];
    var priceChange = endingPrice.price - startingPrice.price;
    var priceMovement = priceChange > 0 ? 'positive' : 'negative';
    
    this.ethereumSpyDb.getPriceMovementPredictionModel(function(predictionModel){
        var textClassifier = predictionModel ? bayes.fromJson(predictionModel.textClassifierJson)
                                             : bayes();
        
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
};

// TODO: move to hourly sentiment analysis
AnalysisService.prototype.analyze = function(prices, tweets, type){
    console.log('Running ' + type + ' analysis on ' + tweets.length + ' Tweets');
    if(!tweets || tweets.length === 0 || !prices || prices.length === 0){
        console.log('Skipping analysis, no Tweets or Prices');
        return;
    }
    
    var self = this;
    var startingPrice = prices[0];
    var endingPrice = prices[prices.length - 1];
    var priceChange = endingPrice.price - startingPrice.price;
    var priceMovement = priceChange > 0 ? 'positive' : 'negative';
    
    console.log('Price Increase? ' + priceMovement);
    
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

    this.ethereumSpyDb.getPredictionModel(function(predictionModel){
        var textClassifier;
        if(predictionModel){
            textClassifier = bayes.fromJson(predictionModel.textClassifierJson);
        } else {
            textClassifier = bayes();
        }
        
        // test prediction model
        var testResult = textClassifier.categorize(todaysTweetCorpus);
        var modelPredictedCorrectly = testResult == priceMovement;
        if(!modelPredictedCorrectly){
            console.log('Classification model categorized incorrectly');
        }
        
        textClassifier.learn(todaysTweetCorpus, priceChange);
    
        var analysis = {
            overallSentimentScore: overallSentimentScore,
            mostCriticalTweet : mostCriticalTweet.text,
            mostPositiveTweet : mostPositiveTweet.text,
            priceChange: priceChange,
            modelPredictedCorrectly: modelPredictedCorrectly,
            type: type
        };
        
        this.ethereumSpyDb.saveAnalysisResults(analysis, function(){
            console.log(analysis.type + ' Analysis saved');
        }, this);
        this.ethereumSpyDb.updatePredictionModel(textClassifier.toJson(), function(){
            console.log('Prediction Model updated');
        });
    }, this);   
};

module.exports = AnalysisService;