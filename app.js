const _ = require('lodash');
const DataCollectionService = require('./services/dataCollectionService');
const EthereumSpyDb = require('./ethereumSpyDb');
const express = require('express');
const exphbs  = require('express-handlebars');
const handlebarsHelpers = require('./handlebarsHelpers');

const ethereumSpyDb = new EthereumSpyDb(process.env.ETHEREUM_SPY_DATABASE_CONN);
const dataCollectionService = new DataCollectionService(ethereumSpyDb);
// TODO: put on a worker thread
dataCollectionService.scheduleDataCollection();

var app = express();
app.use((req, res, next) => {
    req.ethereumSpyDb = ethereumSpyDb;
    next();
});
app.use("/public", express.static(__dirname + '/public'));
app.use('/', require('./controllers/index'));
app.engine('handlebars', exphbs({ defaultLayout: 'main', helpers: handlebarsHelpers }));
app.set('view engine', 'handlebars');

if(process.env.NODE_ENV == 'development' && process.env.CLEAR_DB_ON_START){
    //ethereumSpyDb.clearDatabase();
}

app.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});