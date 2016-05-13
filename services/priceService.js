var request = require('request');

function PriceService(){
    
}

PriceService.prototype.getPrice = function(coinTicker, callback){
    request('https://www.cryptonator.com/api/ticker/' + coinTicker + '-usd', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body);
            var responseObj = JSON.parse(body);
            callback(responseObj.ticker);
        }
    });
};

module.exports = PriceService;