const request = require('request');

class PriceService{
    getPrice(coinTicker, callback){
        request('https://www.cryptonator.com/api/ticker/' + coinTicker + '-usd', (error, response, body) => {
            if (!error && response.statusCode == 200) {
                console.log(body);
                var responseObj = JSON.parse(body);
                callback({
                    coinTicker: responseObj.ticker.base,
                    price: responseObj.ticker.price,
                    volume: responseObj.volume,
                    change: responseObj.change,
                    timestamp: responseObj.timestamp * 1000 // convert to ms
                });
            }
        });
    }
}

module.exports = PriceService;