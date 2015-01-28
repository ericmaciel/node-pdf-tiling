var fs = require('fs'),
	gm = require('gm'),
	queueClient = require('./queue/client.js')

exports.resize = function(path, original, zoom, sendAck){
	var folder = path + '/zoom_' + zoom,
			resized = folder + '/resize.png'

	fs.mkdirSync(folder)
	gm(original).resize(zoom, zoom, '%').write(resized, function(err){
		if(err){
			console.log('Error resizing picture')
			throw err
		}

		queueClient.queue({type:'crop', path: folder, resized: resized})
		console.log('Resize-finished')
		sendAck()
	})
}

exports.crop = function(path, resized, sendAck){
	gm(resized).size(function(err, value){
		if(err)throw err

		var rows = Math.ceil(value.height / 256)
		var columns = Math.ceil(value.width / 256)
		var px=0,py=0
		for(var i=0;i<rows;i++){
			for(var j=0;j<columns;j++){
				//See if its required make this synchronous as well
				gm(resized).crop(256,256, px, py).write(path+'/tile_'+i+'_'+j+'.png', function(err){
					if (err) return console.dir(arguments)
				})
				px+=256
			}
			px=0
			py+=256
		}
		console.log('Crop-finished')
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
	queueClient.queueResizes(tasks)
	sendAck()
}

exports.rezieGS = function(pageDir, pageFile, pageName, zoomLevel, sendAck){
	var percent = 100/zoomLevel,
		zoomedPageName = 'zoom_' + (percent * 10),
		zoomedPath = pageDir + '/' + zoomedPageName,
		zoomedFile = zoomedPath + '/' + zoomedPageName + '.png'
	fs.mkdirSync(zoomedPath)
	gm(pageFile)
		.options({imageMagick: true})
		.resize(percent, percent, '%')
		.write(zoomedFile, function(err) {
			if (err) throw err
			queueClient.queue({type:'cropGS', zoomedPath:zoomedPath, zoomedFile:zoomedFile, zoomedPageName:zoomedPageName})
			sendAck()
		})
}

exports.cropGS = function (zoomedPath, zoomedFile, zoomedPageName, sendAck) {
	gm(zoomedFile)
		.options({imageMagick: true})
		.size(function(err, size) {
			if (err) throw err

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
							if (err) throw err
						})
					px += tileSize
				}
				px = 0
				py += tileSize
			}
			sendAck()
		})
}
