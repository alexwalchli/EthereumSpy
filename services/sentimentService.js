var request = require('request');
var sentiment = require('sentiment');


function SentimentService(){
    
}

SentimentService.prototype.getSentiment = function(text){
    var score = sentiment(text).score;
    
    return Math.tanh(score);
};

module.exports = SentimentService;