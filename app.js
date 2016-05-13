var express = require('express');
var app = express();
var DataCollectionService = require('./services/dataCollectionService');
var EthereumSpyDb = require('./ethereumSpyDb');
var twitterConnectionInfo = {
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
        access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
};
var bitcoinDataCollectionService = new DataCollectionService('BTC', process.env.ETHEREUM_SPY_DATABASE_CONN, twitterConnectionInfo);
bitcoinDataCollectionService.startDataCollection();

var ethereumSpyDb = new EthereumSpyDb(process.env.ETHEREUM_SPY_DATABASE_CONN);

app.get('/', function(req, res) {
    ethereumSpyDb.getAnalysisResults(function(results){
        res.send(results);
    });
});

app.listen(3000, function () {
    console.log('Ethereum Spy is running on port 3000!');
});