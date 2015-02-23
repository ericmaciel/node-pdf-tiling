require('./mongoose.js')
var	fs = require('fs')
	, queueClient = require('./queue/client.js')
	, logger = require('./logger.js')
	, logSource = { source: 'render' }
	, execPromise = require('child-process-promise').exec
	, Q = require('q')
	, zoomLevels = require('./queue/config.js').zoomLevels

exports.processRenderMove = function(id, path, file, sendAck){
	var process = 'identify -quiet -format "{\\"pageNum\\":%s,\\"bounds\\":[%W,%H]}," ' + path + '/' + file
	logger.info('Processing['+id+']', logSource)
	execPromise(process)
	.then(function(result){
		logger.info('DONE-Processing['+id+']', logSource)
		return JSON.parse('['+result.	stdout.trim().slice(0, -1)+']').map(function(page) {
			page.pageNum+=1
			return page
		})
	})
	.then(function(pages){
		logger.info('Rendering['+id+'] pages['+pages.length+']', logSource)
		return Q.all(pages.map(function(page){
			var cfg = {
    		maxsize: 2592,
    		baseres: 144
			}
			var res = Math.round(cfg.baseres*Math.min(cfg.maxsize/page.bounds[0], cfg.maxsize/page.bounds[1]))
			var render = 'gs -dNumRenderingThreads=4 -dNOPAUSE -sDEVICE=png16m -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -dFirstPage='+page.pageNum+' -dLastPage='+page.pageNum+' -sOutputFile='+path+'/page_'+page.pageNum+'.png -r'+res+' -q '+path+'/'+file+' -c quit'
			return execPromise(render).then(function(result){
				logger.info('DONE-Rendering['+id+'] page['+page.pageNum+']', logSource)
			})
		}))
	})
	.then(function(){
		logger.info('Moving pages of file['+id+']', logSource)
		var tasks = []
		var files = fs.readdirSync(path)
		for(var i=0;i<files.length;i++){
			var file = files[i]
			if(file.indexOf('page_')!=-1){
				var pageFolder = path + '/' + file.substring(0, file.indexOf('.png'))
				if(!fs.existsSync(pageFolder)){
					fs.mkdirSync(pageFolder)
				}
				fs.renameSync(path + '/' + file, pageFolder + '/' + file)
				for(var j=0;j<zoomLevels.length;j++){
					tasks.push({type:'resizeCrop', id:id, dir: pageFolder, pageName: file, zoom: zoomLevels[j]})
				}
			}
		}
		queueClient.queueTasks(tasks)
		logger.info('DONE-Moving pages of file['+id+']', logSource)
	})
	.fail(function (err) {
		logger.error('Error processAndRender['+file+']', logSource)
		logger.error(err, logSource)
		//TODO sendAck ???? better let it there to try to redo???
		sendAck()
  })
	.done(function(){
		logger.info('DONE-ProcessingRenderingMoving['+id+']', logSource)
		sendAck()
	})
}