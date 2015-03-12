require('./mongoose.js')
var fs = require('fs')
	, queueClient = require('./queue/client.js')
	, logger = require('./logger.js')
	, logSource = { source: 'image-utils' }
	, mongoose = require('mongoose')
	, PDF = mongoose.model('Pdf')
	, execPromise = require('child-process-promise').exec

exports.resizeAndCrop = function(id, dir, pageName, zoom, sendAck){
	//Resize variables
	var input = dir + '/' + pageName,
		outPath = dir + '/zoom_' + zoom,
		output = outPath + '/resize.png'

	if (!fs.existsSync(outPath)) {
		fs.mkdirSync(outPath)
	}

	var resizeCommand = 'convert ' + input + ' -resize ' + zoom + '% ' + output
	var cropCommand = 'convert ' + output + ' -crop 256x256 -set filename:tile "%[fx:page.y/256]_%[fx:page.x/256]" +repage +adjoin "' + outPath + '/tile_%[filename:tile].png"'

	logger.info('Resizing['+id+'] page['+pageName+'] zoom['+zoom+']', logSource)
	execPromise(resizeCommand)
	.then(function(result){
		logger.info('DONE-Resizing['+id+'] page['+pageName+'] zoom['+zoom+']', logSource)
		PDF.addZoom(mongoose.Types.ObjectId(id), zoom)
		logger.info('Croping['+id+'] page['+pageName+'] zoom['+zoom+']', logSource)
		return execPromise(cropCommand)
	})
	.then(function(){
		logger.info('DONE-Croping['+id+'] page['+pageName+'] zoom['+zoom+']', logSource)
		return PDF.decrementStep(id)
	})
	.fail(function (err) {
		logger.error('Error resizeAndCrop['+input+']', logSource)
		logger.error(err, logSource)
		sendAck()
  })
	.done(function(){
		logger.info('DONE-resizeAndCrop['+id+']', logSource)
		sendAck()
	})
}

exports.thumbnail=function(id,dir,filename, ack){
	var input = dir + '/' + filename
		, output = dir + '/thumbnail.png'
		, thumbailCommand = 'convert ' + input +' -resize 256x256 ' + output
	execPromise(thumbailCommand)
	.then(function(){
		return PDF.decrementStep(id)
	})
	.fail(function (err) {
		logger.error('ERROR-thumbnail['+id+'] page['+filename+']',{error:err}, logSource)
  })
	.done(function(){
		logger.info('DONE-thumbnail['+id+'] page['+filename+']', logSource)
		ack()
	})

}