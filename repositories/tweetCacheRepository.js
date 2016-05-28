
class TweetCacheRepository extends DataRepository{
    cacheBulk(analyzedTweets, callback){
        var bulk = this.db.analyzedTweetCache.initializeUnorderedBulkOp();
        analyzedTweets.forEach((analyzedTweet) => { bulk.insert(analyzedTweet); });
        bulk.execute((error, resp) => { this._handleDatabaseResponse(error, resp, callback); });
    }
    
    cache(analyzedTweet, callback){
        this.db.analyzedTweetCache.insert(analyzedTweet);
    }
}