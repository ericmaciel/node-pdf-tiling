require('./mongoose.js')
var	fs = require('fs'),
	queueClient = require('./queue/client.js'),
	logger = require('./logger.js'),
	logSource = { source: 'render' },
	exec = require('child_process').exec,
	mongoose = require('mongoose'),
	PDF = mongoose.model('Pdf')
	

exports.process = function(id, path, file, sendAck) {
	var command = 'identify -quiet -format "{\\"pageNum\\":%s,\\"bounds\\":[%W,%H]}," ' + path + '/' + file
	logger.info(command, logSource)
	exec(command, function(error, stdout, strerr) {
		if(error) {
			logger.error(error, logSource)
			logger.error(stderr, logSource)
			throw error
		}else{
			logger.info('Finished processing file['+file+']', logSource)
			PDF.decrementStep(mongoose.Types.ObjectId(id))

			var tasks = []
			var pages = JSON.parse('['+stdout.trim().slice(0, -1)+']').map(function(page) {
				page.pageNum+=1
				return page
			})
			for (var i=0; i<pages.length; i++) {
				tasks.push({type:'render', id:id, path:path, file:file, page:pages[i]})
			}
			queueClient.queueTasks(tasks)
		}
		sendAck()
	})
}

exports.render = function(id, path, file, page, sendAck){
	var cfg = {
    		maxsize: 2592,
    		baseres: 144
			}
	var res = Math.round(cfg.baseres*Math.min(cfg.maxsize/page.bounds[0], cfg.maxsize/page.bounds[1]))
	var command = 'gs -dNumRenderingThreads=4 -dNOPAUSE -sDEVICE=png16m -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -dFirstPage='+page.pageNum+' -dLastPage='+page.pageNum+' -sOutputFile='+path+'/page_'+page.pageNum+'.png -r'+res+' -q '+path+'/'+file+' -c quit'
	logger.info(command, logSource)
	exec(command, function(error, stdout, stderr){
		if(error){
			logger.error(error, logSource)
			logger.error(stderr, logSource)
			throw error
		}else{
			logger.info('Finished rendering file['+file+']')
			PDF.decrementStep(mongoose.Types.ObjectId(id))
			
			// var pageNames = fs.readdirSync(path).filter(function(file) {
			// 		return (file.indexOf('.png') != -1)
			// 	}).map(function(file) {
			// 		return file.substring(0, file.lastIndexOf('.png'))
			// 	})
			var pageNames = ['page_'+page.pageNum]
			queueClient.queue({type:'move', id:id, dest: path, pageNames:pageNames})
		}
		sendAck()
	})
}