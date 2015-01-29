var	fs = require('fs'),
	queueClient = require('./queue/client.js'),
	logger = require('./logger.js'),
	logSource = { source: 'render' },
	exec = require('child_process').exec

exports.render = function(path, file, sendAck){
	var command = 'gs -dNumRenderingThreads=4 -dNOPAUSE -sDEVICE=png16m -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -sOutputFile='+path+'/page_%d.png -r144 -q '+path+'/'+file+' -c quit'
	logger.info(command, logSource)
	exec(command, function(error, stdout, stderr){
		if(error){
			logger.error(error, logSource)
			logger.error(stderr, logSource)
			throw error
		}else{
			logger.info('Finished rendering file['+file+']')

			var pageNames = fs.readdirSync(path).filter(function(file) {
					return (file.indexOf('.png') != -1)
				}).map(function(file) {
					return file.substring(0, file.lastIndexOf('.png'))
				})
			queueClient.queue({type:'move', dest: path, pageNames:pageNames})
		}
		sendAck()
	})
}