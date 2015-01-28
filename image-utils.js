var fs = require('fs'),
	gm = require('gm'),
	queueClient = require('./queue/client.js'),
	logger = require('./logger.js'),
	logSource = { source: 'image-utils' },
	exec = require('child_process').exec

exports.resize = function(path, original, zoom, sendAck){
	var folder = path + '/zoom_' + zoom,
			resized = folder + '/resize.png'

	fs.mkdirSync(folder)
	gm(original).resize(zoom, zoom, '%').write(resized, function(err){
		if(err){
			logger.error('Error resizing picture['+original+']')
			throw err
		}

		queueClient.queue({type:'crop', path: folder, resized: resized})
		logger.info('Resize['+original+']-finished')
		sendAck()
	})
}

exports.resizeGS = function(pageDir, pageFile, pageName, zoomLevel, sendAck){
	var percent = 100/zoomLevel,
		zoomedPageName = 'zoom_' + Math.floor(percent),
		zoomedPath = pageDir + '/' + zoomedPageName,
		zoomedFile = zoomedPath + '/resize.png'
	fs.mkdirSync(zoomedPath)
	gm(pageFile)
		.options({imageMagick: true})
		.resize(percent, percent, '%')
		.write(zoomedFile, function(err) {
			if (err) {
				logger.error('Error resizing['+pageFile+']', logSource)
				logger.error(err, logSource)
				throw err
			}
			queueClient.queue({type:'cropGS', zoomedPath:zoomedPath, zoomedFile:zoomedFile, zoomedPageName:zoomedPageName})
			sendAck()
		})
}

exports.crop = function(path, resized, sendAck){
	gm(resized).size(function(err, value){
		if(err){
			logger.error('Error getting picture['+resized+'] dimensions', logSource)
			logger.error(err, logSource)
			throw err
		}

		var rows = Math.ceil(value.height / 256)
		var columns = Math.ceil(value.width / 256)
		var px=0,py=0
		for(var i=0;i<rows;i++){
			for(var j=0;j<columns;j++){
				//See if its required make this synchronous as well
				gm(resized).crop(256,256, px, py).write(path+'/tile_'+i+'_'+j+'.png', function(err){
					if (err) {
						logger.error('Error cropping['+resized+']', logSource)
						logger.error(err, logSource)
						throw err
					}
				})
				px+=256
			}
			px=0
			py+=256
		}
		logger.info('Crop-finished ['+resized+']', logSource)
		sendAck()
	})
}

exports.cropGS = function (zoomedPath, zoomedFile, zoomedPageName, sendAck) {
	gm(zoomedFile)
		.options({imageMagick: true})
		.size(function(err, size) {
			if(err){
			logger.error('Error getting picture['+zoomedFile+'] dimensions', logSource)
			logger.error(err, logSource)
			throw err
		}

			var tileSize = 256
			var rows = Math.ceil(size.height / tileSize)
			var cols = Math.ceil(size.width / tileSize)
			var px = 0, py = 0
			for(var i = 0; i < rows; i++){
				for(var j = 0; j < cols; j++){
					gm(zoomedFile)
						.options({imageMagick: true})
						.crop(tileSize, tileSize, px, py)
						.write(zoomedPath + '/tile_' + i + '_' + j + '.png', function(err){
							if (err) {
								logger.error('Error cropping['+zoomedFile+']', logSource)
								logger.error(err, logSource)
								throw err
							}
						})
					px += tileSize
				}
				px = 0
				py += tileSize
			}
			logger.info('Crop-finished ['+zoomedFile+']', logSource)
			sendAck()
		})
}

exports.movePictures = function(baseDir, pageNames,sendAck){
	var zoomLevels = [1, 2, 4, 8]
	var tasks = []
	for(var j=0;j<pageNames.length;j++){
		var pageName = pageNames[j]
		var path = baseDir + '/' + pageName,
			pageFile = path + '/' + pageName + '.png'
		fs.mkdirSync(path)
		fs.renameSync(path + '.png', pageFile)
		for (var i = 0; i < zoomLevels.length; i++) {
			tasks.push({type:'resizeGS', pageDir: path,pageFile: pageFile, pageName: pageName, zoom: zoomLevels[i]})
		}
	}
	logger.info('Successfully moved picutres['+pageNames.length+']', logSource)
	queueClient.queueResizes(tasks)
	sendAck()
}

//Command line
exports.movePicturesCL = function(baseDir, pageNames,sendAck){
	var zoomLevels = [1, 2, 4, 8]
	var tasks = []
	for(var j=0;j<pageNames.length;j++){
		var pageName = pageNames[j]
		var path = baseDir + '/' + pageName,
			pageFile = path + '/' + pageName + '.png'
		fs.mkdirSync(path)
		fs.renameSync(path + '.png', pageFile)
		for (var i = 0; i < zoomLevels.length; i++) {
			tasks.push({type:'resizeGS-cl', pageDir: path,pageFile: pageFile, pageName: pageName, zoom: zoomLevels[i]})
		}
	}
	logger.info('Successfully moved picutres['+pageNames.length+']', logSource)
	queueClient.queueResizes(tasks)
	sendAck()
}

exports.resizeGLCL = function(pageDir, pageFile, pageName, zoomLevel, sendAck){
	var percent = 100/zoomLevel,
		zoomedPageName = 'zoom_' + Math.floor(percent),
		zoomedPath = pageDir + '/' + zoomedPageName,
		zoomedFile = zoomedPath + '/resize.png'
	fs.mkdirSync(zoomedPath)

	var command = 'convert ' + pageFile + ' -resize ' + percent + '% ' + zoomedFile
	logger.info('resizeGLCL: '+ command, logSource)
	exec(command, function(err, stdout, stderr){
		if (err) {
				logger.error('Error resizing['+pageFile+']', logSource)
				logger.error(err, logSource)
				throw err
			}
			queueClient.queue({type:'cropGS-cl', zoomedPath:zoomedPath, zoomedFile:zoomedFile, zoomedPageName:zoomedPageName})
			sendAck()
	})
}

exports.cropGSCL = function (zoomedPath, zoomedFile, zoomedPageName, sendAck) {
	var command = 'convert ' + zoomedFile + ' -crop 256x256 -set filename:tile "%[fx:page.y/256]_%[fx:page.x/256]" +repage +adjoin "' + zoomedPath + '/tile_%[filename:tile].png"'
	logger.info('cropGSCL:'+ command, logSource)
	exec(command, function(err, stdout, stderr){
		if (err) {
			logger.error('Error cropping['+zoomedFile+']', logSource)
			logger.error(err, logSource)
			throw err
		}else{
			logger.info('Crop-finished ['+zoomedFile+']', logSource)
		}
		sendAck()
	})
}