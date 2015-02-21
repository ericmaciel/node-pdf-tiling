require('./mongoose.js')
var fs = require('fs'),
	queueClient = require('./queue/client.js'),
	logger = require('./logger.js'),
	logSource = { source: 'image-utils' },
	exec = require('child_process').exec,
	pictureExtension = '.png',
	mongoose = require('mongoose'),
	PDF = mongoose.model('Pdf')
	, execPromise = require('child-process-promise').exec

exports.movePageFiles = function(id, dir, pageNames,sendAck){
	var zoomLevels = [100, 50, 25, 12.5]
	var tasks = [{type:'decrement_step', id: id}]
	for(var j=0;j<pageNames.length;j++){
		var pageName = pageNames[j]
		var path = dir + '/' + pageName,
			pageFile = path + '/' + pageName + pictureExtension
		if (!fs.existsSync(path)) {
			fs.mkdirSync(path)
		}
		fs.renameSync(path + pictureExtension, pageFile)
		for (var i = 0; i < zoomLevels.length; i++) {
			tasks.push({type:'resize2', id:id, dir: path, pageName: pageName, zoom: zoomLevels[i]})
		}
	}

	logger.info('Successfully moved picutres['+pageNames.length+']', logSource)
	queueClient.queueTasks(tasks)
	sendAck()
}

exports.resize = function(id, dir, pageName, zoom, sendAck){
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
				PDF.addZoom(mongoose.Types.ObjectId(id), zoom)
				queueClient.queueTasks([
					{type:'decrement_step', id: id},
					{type:'crop', id:id, dir:outPath, resized:output}])
			}
			sendAck()
	})
}

exports.crop = function (id, dir, resized, sendAck) {
	var command = 'convert ' + resized + ' -crop 256x256 -set filename:tile "%[fx:page.y/256]_%[fx:page.x/256]" +repage +adjoin "' + dir + '/tile_%[filename:tile].png"'
	logger.info('CROP:'+ command, logSource)
	exec(command, function(err, stdout, stderr){
		if (err) {
			logger.error('Error cropping['+resized+']', logSource)
			logger.error(err, logSource)
			throw err
		}else{
			queueClient.queue({type:'decrement_step', id: id})
			logger.info('CROP-finished ['+resized+']', logSource)
		}
		sendAck()
	})
}

exports.resizeAndCrop = function(id, dir, pageName, zoom, sendAck){
	//Resize variables
	var input = dir + '/' + pageName + pictureExtension,
		outPath = dir + '/zoom_' + zoom,
		output = outPath + '/resize.png'

	if (!fs.existsSync(outPath)) {
		fs.mkdirSync(outPath)
	}

	var resizeCommand = 'convert ' + input + ' -resize ' + zoom + '% ' + output
	logger.info('RESIZE: '+ resizeCommand, logSource)

	var cropCommand = 'convert ' + output + ' -crop 256x256 -set filename:tile "%[fx:page.y/256]_%[fx:page.x/256]" +repage +adjoin "' + outPath + '/tile_%[filename:tile].png"'

	execPromise(resizeCommand)
	.then(function(result){
		logger.info('RESIZE-finished ['+input+']')
		PDF.addZoom(mongoose.Types.ObjectId(id), zoom)
		logger.info('CROP:'+ cropCommand, logSource)
		return execPromise(cropCommand)
	})
	.then(function(){
		queueClient.queue({type:'decrement_step', id: id})
		logger.info('CROP-finished ['+output+']', logSource)
		sendAck()
	})
	.fail(function (err) {
		logger.error('Error resizeAndCrop['+input+']', logSource)
		logger.error(err, logSource)
		sendAck()
  })
}