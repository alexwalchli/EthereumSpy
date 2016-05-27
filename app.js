const _ = require('lodash');
const DataCollectionService = require('./services/dataCollectionService');
const EthereumSpyDb = require('./ethereumSpyDb');
const express = require('express');
const exphbs  = require('express-handlebars');
const handlebarHelpers = {
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

const twitterConnectionInfo = {
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
};
const coinsTrackingInfo = [ { ticker: 'BTC', phrase: 'bitcoin' }, { ticker: 'ETH', phrase: 'ethereum' } ];
const ethereumSpyDb = new EthereumSpyDb(process.env.ETHEREUM_SPY_DATABASE_CONN);
const dataCollectionService = new DataCollectionService(coinsTrackingInfo, twitterConnectionInfo, ethereumSpyDb);
dataCollectionService.scheduleDataCollection();

var app = express();
app.use((req, res, next) => {
    req.ethereumSpyDb = ethereumSpyDb;
    next();
});
app.use("/public", express.static(__dirname + '/public'));
app.use('/', require('./controllers/index'));
app.engine('handlebars', exphbs({
    defaultLayout: 'main',
    helpers: handlebarHelpers
}));
app.set('view engine', 'handlebars');

if(process.env.NODE_ENV == 'development' && process.env.CLEAR_DB_ON_START){
    //ethereumSpyDb.clearDatabase();
}

app.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});