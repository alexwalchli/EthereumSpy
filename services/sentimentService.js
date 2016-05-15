var request = require('request');
var sentiment = require('sentiment');

class SentimentService{
    getSentiment(text){
        var score = sentiment(text).score;
    
        return Math.tanh(score);
    }
}

module.exports = SentimentService;