var _ = require('lodash');
var express = require('express');
var exphbs  = require('express-handlebars');
var app = express();

var handlebarHelpers = {
    equal: function(lvalue, rvalue, options) {
        if (arguments.length < 3)
            throw new Error("Handlebars Helper equal needs 2 parameters");
        if( lvalue!=rvalue ) {
            return options.inverse(this);
        } else {
            return options.fn(this);
        }
    }  
};
app.use("/public", express.static(__dirname + '/public'));
app.engine('handlebars', exphbs({
    defaultLayout: 'main',
    helpers: handlebarHelpers
}));
app.set('view engine', 'handlebars');

var DataCollectionService = require('./services/dataCollectionService');
var EthereumSpyDb = require('./ethereumSpyDb');
var twitterConnectionInfo = {
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
};

var coinsTrackingInfo = [
    {
        ticker: 'BTC',
        phrase: 'bitcoin' 
    },
    {
        ticker: 'ETH',
        phrase: 'ethereum' 
    },
];

var bitcoinDataCollectionService = new DataCollectionService(coinsTrackingInfo, process.env.ETHEREUM_SPY_DATABASE_CONN, twitterConnectionInfo);
bitcoinDataCollectionService.scheduleDataCollection();
var ethereumSpyDb = new EthereumSpyDb(process.env.ETHEREUM_SPY_DATABASE_CONN);

if(process.env.NODE_ENV == 'development' && process.env.CLEAR_DB_ON_START){
    //ethereumSpyDb.clearDatabase();
}

app.get('/', function(req, res){
   ethereumSpyDb.getPredictionsGroupedByCoinsThenByModels((predictionsGroupedByCoinsThenByModels) => {
        res.render('home', { predictionsGroupedByCoinsThenByModels: predictionsGroupedByCoinsThenByModels });
    });
});

app.get('/console', function(req, res) {
    ethereumSpyDb.getPredictionsGroupedByModels((predictionModels) => {
        predictionModels.forEach((predictionModel) => {
            var correctPredictions = predictionModel.predictions.filter((prediction) => {
                return prediction.previousPredictionCorrect;
            });
            
            predictionModel.predictionVetted = predictionModel.predictionWasCorrect !== null;
            predictionModel.predictionAccuracy = Math.round(correctPredictions.length / predictionModel.predictions.length * 100);
        });
        
        res.render('console', { models: predictionModels });
    });
});

app.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});