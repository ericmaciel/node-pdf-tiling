var mongoose = require('mongoose')
	, merge = require('mongoose-merge-plugin')
	, logger = require('./logger.js')
	, config = require('./queue/config.js')

mongoose.plugin(merge)
mongoose.connect(config.mongo.db)

var db = mongoose.connection

db.on('error', function(err){
	logger.error('Error connecting DB'+err, { source: 'mongodb' })
})

db.on('open', function(){
	logger.info('Successfully connected to DB', { source: 'mongodb' })
})

require("fs").readdirSync(__dirname + "/models").forEach(function (file) {
  require("./models/" + file);
});
