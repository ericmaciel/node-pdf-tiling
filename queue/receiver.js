 var bramqp = require('bramqp'),
		net = require('net'),
		async = require('async'),
		config = require('./config.js'),
		socket = net.connect(config.connection)
		render = require('../render.js'),
		imageUtils = require('../image-utils.js')

var handle

bramqp.initialize(socket, 'rabbitmq/full/amqp0-9-1.stripped.extended', function(err, _handle){
  if (err) console.log('Error Opening socket' + { source: 'rabbitmq', err: err })

  handle = _handle
  async.series([
  	function(seriesCallback){
			handle.openAMQPCommunication(config.creds.user, config.creds.pass, true, seriesCallback);
  	}, function(seriesCallback){
  		handle.basic.qos(1, 0, 1, false)
  		handle.once('basic.qos-ok', function(channel, mehtod, data){
				console.log('QOS accepted')
  			seriesCallback()
  		})
  	}, function(seriesCallback){
  		handle.queue.declare(1, config.queue.render, false, true, false, false, false, {})
  		handle.once('queue.declare-ok', function(channel, method, data) {
      	console.log('Queue['+config.queue.render+'] declared')
      	seriesCallback()
    	})
  	}, function(seriesCallback){//Consuming config.queue.render queue
  		handle.basic.consume(1, config.queue.render, null, false, false, false, false, {});
    	handle.once('basic.consume-ok', function(channel, method, data) {
    		console.log('Consuming from queue['+config.queue.render+']')
      	console.log(data)
      	handle.on('basic.deliver', function(channel, method, data) {
          handle.once('content', function(channel, className, properties, content) {
          	var task = JSON.parse(content.toString())
	        	console.log('Incomming message ' + task.type)
          	
          	if(task.type=='render'){
	          	render.render(task.mode, task.path, task.file, generateAckFunction('RENDER', data))	
          	}else if(task.type=='resize'){
          		imageUtils.resize(task.path, task.original, task.zoom, generateAckFunction('RESIZE', data))
          	}else if(task.type=='crop'){
        			imageUtils.crop(task.path, task.resized, generateAckFunction('CROP', data))
          	}else if(task.type=='move'){
          		imageUtils.movePictures(task.dest, task.pageNames, generateAckFunction('MOVE', data))
          	}else if(task.type=='resizeGS'){
          		imageUtils.rezieGS(task.pageDir, task.pageFile, task.pageName, task.zoom, generateAckFunction('RESIZE', data))
          	}else if(task.type=='cropGS'){
          		imageUtils.cropGS(task.zoomedPath, task.zoomedFile, task.zoomedPageName, generateAckFunction('CROP', data))
          	}else{
          		console.log('Error unkown type['+task.type+']')
          		handle.basic.ack(1, data['delivery-tag'])
          	}
        	})
      	})
      	seriesCallback()
    	})
  	}
	], function(){
		console.log('All done')
	})
})

function generateAckFunction(info, data){
	return function(){
		console.log('ACKing-'+info)
		handle.basic.ack(1, data['delivery-tag'])
	}
}