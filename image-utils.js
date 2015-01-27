var fs = require('fs'),
	gm = require('gm'),
	queueClient = require('./queue/client.js')

exports.resize = function(path, original, zoom, sendAck){
	var folder = path + '/zoom_' + zoom,
			resized = folder + '/resize.png'

	console.log(path)
	console.log(original)
	console.log(zoom)
	console.log(folder)
	console.log(resized)

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