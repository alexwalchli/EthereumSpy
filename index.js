var _ = require('lodash');
var express = require('express');
var exphbs  = require('express-handlebars');
var app = express();
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

var DataCollectionService = require('./services/dataCollectionService');
var EthereumSpyDb = require('./ethereumSpyDb');
var twitterConnectionInfo = {
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
};
var bitcoinDataCollectionService = new DataCollectionService('BTC', process.env.ETHEREUM_SPY_DATABASE_CONN, twitterConnectionInfo);
bitcoinDataCollectionService.scheduleDataCollection();
var ethereumSpyDb = new EthereumSpyDb(process.env.ETHEREUM_SPY_DATABASE_CONN);

if(process.env.NODE_ENV == 'development' && process.env.CLEAR_DB_ON_START){
    ethereumSpyDb.clearDatabase();
}

app.get('/', function(req, res) {
    ethereumSpyDb.getPriceMovementPredictionResults(function(results){
        var modelAccuracy = _.filter(results, { predictedCorrectly: true }).length / results.length;
        
        res.render('home', { modelAccuracy: modelAccuracy, results: results });
    });
});

var port = process.env.PORT || 3000;
app.listen(port, function(){
    console.log('EthereumSpy listening on: ' + port);
});