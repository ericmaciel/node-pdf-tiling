var fs = require('fs'),
	queueClient = require('./queue/client.js'),
	logger = require('./logger.js'),
	logSource = { source: 'image-utils' },
	exec = require('child_process').exec,
	pictureExtension = '.png'

exports.movePageFiles = function(dir, pageNames,sendAck){
	var zoomLevels = [100, 50, 25, 12.5]
	var tasks = []
	for(var j=0;j<pageNames.length;j++){
		var pageName = pageNames[j]
		var path = dir + '/' + pageName,
			pageFile = path + '/' + pageName + pictureExtension
		if (!fs.existsSync(path)) {
			fs.mkdirSync(path)
		}
		fs.renameSync(path + pictureExtension, pageFile)
		for (var i = 0; i < zoomLevels.length; i++) {
			tasks.push({type:'resize', dir: path, pageName: pageName, zoom: zoomLevels[i]})
		}
	}
	logger.info('Successfully moved picutres['+pageNames.length+']', logSource)
	queueClient.queueTasks(tasks)
	sendAck()
}

exports.resize = function(dir, pageName, zoom, sendAck){
	var input = dir + '/' + pageName + pictureExtension,
		outPath = dir + '/zoom_' + zoom,
		output = outPath + '/resize.png'

	if (!fs.existsSync(outPath)) {
		fs.mkdirSync(outPath)
	}

	var command = 'convert ' + input + ' -resize ' + zoom + '% ' + output
	logger.info('RESIZE: '+ command, logSource)
	exec(command, function(err, stdout, stderr){
		if (err) {
				logger.error('Error resizing['+input+']', logSource)
				logger.error(err, logSource)
				throw err
			}else{
				logger.info('RESIZE-finished ['+input+']')
				queueClient.queue({type:'crop', dir:outPath, resized:output})
			}
			sendAck()
	})
}

exports.crop = function (dir, resized, sendAck) {
	var command = 'convert ' + resized + ' -crop 256x256 -set filename:tile "%[fx:page.y/256]_%[fx:page.x/256]" +repage +adjoin "' + dir + '/tile_%[filename:tile].png"'
	logger.info('CROP:'+ command, logSource)
	exec(command, function(err, stdout, stderr){
		if (err) {
			logger.error('Error cropping['+resized+']', logSource)
			logger.error(err, logSource)
			throw err
		}else{
			logger.info('CROP-finished ['+resized+']', logSource)
		}
		sendAck()
	})
}