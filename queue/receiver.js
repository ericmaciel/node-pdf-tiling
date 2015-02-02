 var bramqp = require('bramqp'),
	net = require('net'),
	async = require('async'),
	config = require('./config.js'),
	socket = net.connect(config.connection)
	render = require('../render.js'),
	imageUtils = require('../image-utils.js'),
	logger = require('../logger.js'),
	logSource = { source: 'receiver' }

var handle

bramqp.initialize(socket, 'rabbitmq/full/amqp0-9-1.stripped.extended', function(err, _handle){
  if (err) logger.Error('Error Opening socket' + { source: 'rabbitmq', err: err }, logSource)

  handle = _handle
  async.series([
  	function(seriesCallback){
			handle.openAMQPCommunication(config.creds.user, config.creds.pass, true, seriesCallback);
  	}, function(seriesCallback){
  		handle.basic.qos(1, 0, 1, false)
  		handle.once('basic.qos-ok', function(channel, mehtod, data){
				logger.info('QOS accepted', logSource)
  			seriesCallback()
  		})
  	}, function(seriesCallback){
  		handle.queue.declare(1, config.queue.render, false, true, false, false, false, {})
  		handle.once('queue.declare-ok', function(channel, method, data) {
      	logger.info('Queue['+config.queue.render+'] declared', logSource)
      	seriesCallback()
    	})
  	}, function(seriesCallback){//Consuming config.queue.render queue
  		handle.basic.consume(1, config.queue.render, null, false, false, false, false, {});
    	handle.once('basic.consume-ok', function(channel, method, data) {
    		logger.info('Consuming from queue['+config.queue.render+']', logSource)
      	handle.on('basic.deliver', function(channel, method, data) {
          handle.once('content', function(channel, className, properties, content) {
          	var task = JSON.parse(content.toString())
	        	logger.info('Incomming message ' + task.type, logSource)
          	
            if(task.type=='process') {
              render.process(task.path, task.file, generateAckFunction('PROCESS', data))
            }else if(task.type=='render'){
	          	render.render(task.path, task.file, task.page, generateAckFunction('RENDER', data))	
          	}else if(task.type=='move'){
          		imageUtils.movePageFiles(task.dest, task.pageNames, generateAckFunction('MOVE', data))
          	}else if(task.type=='resize'){
          		imageUtils.resize(task.dir, task.pageName, task.zoom, generateAckFunction('RESIZE', data))
          	}else if(task.type=='crop'){
        			imageUtils.crop(task.dir, task.resized, generateAckFunction('CROP', data))
          	}else{
          		logger.warn('Error unkown type['+task.type+']', logSource)
          		handle.basic.ack(1, data['delivery-tag'])
          	}
        	})
      	})
      	seriesCallback()
    	})
  	}
	], function(){
		logger.info('All done', logSource)
	})
})

function generateAckFunction(info, data){
	return function(){
		logger.info('ACKing-'+info, logSource)
		handle.basic.ack(1, data['delivery-tag'])
	}
}