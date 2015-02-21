require('./mongoose.js')
var	fs = require('fs'),
	queueClient = require('./queue/client.js'),
	logger = require('./logger.js'),
	logSource = { source: 'render' },
	exec = require('child_process').exec
	, execPromise = require('child-process-promise').exec
	, Q = require('q')
	
/*
 * Check each page of the document and gather it's width and height
 */ 
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

			//TODO add promise to decrement_step and do not use it on MQ
			var tasks = [{type:'decrement_step', id: id}]
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

/*
 * It's going to rende pdf page into png file
 */
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
			var pageNames = ['page_'+page.pageNum]
			//TODO add promise to decrement_step and do not use it on MQ
			queueClient.queueTasks([
				{type:'decrement_step', id: id},
				{type:'move', id:id, dest: path, pageNames:pageNames}])
		}
		sendAck()
	})
}

exports.processAndRender = function(id, path, file, sendAck){
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
				logger.info('DONE-Rendering['+id+'] pages['+page.pageNum+']', logSource)
			})
		}))
	})
	.fail(function (err) {
		logger.error('Error processAndRender['+file+']', logSource)
		logger.error(err, logSource)
		//TODO sendAck ???? better let it there to try to redo???
		sendAck()
  })
	.done(function(){
		logger.info('DONE-Rendering['+id+']', logSource)
		sendAck()
	})
}