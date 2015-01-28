var bramqp = require('bramqp'),
		net = require('net'),
		async = require('async'),
		config = require('./config.js'),
		socket = net.connect(config.connection)

module.exports = new function(){
	var handle

	function openConnection(){
		bramqp.initialize(socket, 'rabbitmq/full/amqp0-9-1.stripped.extended', function(error, _handle) {
			handle = _handle
			handle.on('error', function(error){
        console.log("caught handle error");
        throw(error);
	    });
			async.series([
				function(seriesCallback) {
					handle.openAMQPCommunication(config.creds.user, config.creds.pass, true, seriesCallback);
				},
				function(seriesCallback) {
            handle.queue.declare(1, config.queue.render, false, true, false, false, false, {});
            handle.once('queue.declare-ok', function(channel, method, data) {
            	console.log('Queue declared')
            });
        },function(seriesCallback){
        	console.log('connected')
        }	
			])
		})
	}

	openConnection()

	this.queue = function(task){
		async.series([
			function(seriesCallback){
				handle.basic.publish(1, '', config.queue.render, false, false, function(){
					handle.content(1, 'basic', {
						'content-type' : 'application/json',
          	'delivery-mode' : 2
					}, JSON.stringify(task), seriesCallback)
				})
			}, function(seriesCallback){
				console.log('Task['+task.type+'] queued properly')
			}
		])
	}

	this.queueResizes = function(tasks){
		var functions = []
		for(var i=0;i<tasks.length;i++){
			functions.push(this.generatePublishFunction(tasks[i]))
		}
		functions.push(function(seriesCallback){
				console.log('Tasks['+tasks.length+'] queued properly')
		})

		async.series(functions)
	}

	this.generatePublishFunction = function(message){
		return function(seriesCallback){
			handle.basic.publish(1, '', config.queue.render, false, false, function(){
					handle.content(1, 'basic', {
						'content-type' : 'application/json',
          	'delivery-mode' : 2
					}, JSON.stringify(message), seriesCallback)
				})
		}
	}
}