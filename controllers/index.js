var express = require('express');
var router = express.Router();

router.get('/', function(req, res){
   req.ethereumSpyDb.getPredictionsGroupedByCoinsThenByModels((predictionsGroupedByCoinsThenByModels) => {
        res.render('home', { predictionsGroupedByCoinsThenByModels: predictionsGroupedByCoinsThenByModels });
    });
});

router.get('/history/:modelName', function(req, res){
    var modelName = req.param('modelName');
    req.ethereumSpyDb.getPredictionsByModel(modelName, (predictions) => {
        var correctPredictions = predictions.filter((prediction) => {
            return prediction.predictionWasCorrect;
        });
        
        var predictionAccuracy = Math.round(correctPredictions.length / predictions.length * 100);
        res.render('history', { modelName: modelName, predictions: predictions, predictionAccuracy: predictionAccuracy }); 
    });
});

module.exports = router;