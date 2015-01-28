var	Canvas = require('canvas'),
	fs = require('fs'),
	PDFJS = require('./lib/pdf.js'),
	PDFReader = require('./lib/reader.js').PDFReader,
	queueClient = require('./queue/client.js'),
	gs = require("ghostscript"),
	logger = require('./logger.js'),
	logSource = { source: 'render' },
	exec = require('child_process').exec

exports.render = function(mode, path, file, sendAck){
	if(mode=='pdf'){
		renderPDF(path, file, sendAck)
	}else if(mode=='gs'){
		renderGS(path, file, sendAck)
	}else if(mode=='gs-cl'){
		renderGS_CL(path, file, sendAck)
	}else{
		logger.warn('undefined mode', logSource)
		sendAck()
	}
}

//PDF
function renderPDF(path, file, sendAck){
	var pdf = new PDFReader(path+'/'+file)
	pdf.on('error', errorCallback);
	pdf.on('ready', function(pdf) {
		// Render all pages.
		pdf.renderAll({
			bg: true,
			scaleBounds: [3000, 3000],
			output: function(pageNum) {
				var p = getPagePictureFolderPath(path, pageNum)
				fs.mkdirSync(p)
				return p + '/page' + pageNum + '.png'
			}
			}, function(pageNum){
				logger.info('Finished rendering page ' + pageNum, logSource)
				var p = getPagePictureFolderPath(path, pageNum)
				var fullPath = p + '/page' + pageNum + '.png'
				queueClient.queueResizes([{type:'resize', path: p, original: fullPath, zoom:100}, 
																{type:'resize', path: p, original: fullPath, zoom:75}, 
																{type:'resize', path: p, original: fullPath, zoom:50}, 
																{type:'resize', path: p, original: fullPath, zoom:25}])

				if(pageNum==pdf.pdf.pdfInfo.numPages){
					sendAck()
				}
			}, errorCallback)
	})
}

function errorCallback(err) {
	if (err) {
		logger.error('something went wrong :/', logSource)
		logger.error(err, logSource)
		throw err
	}
}

function getPagePictureFolderPath(path, pageNum){
	return path + '/page_' + pageNum
}

//GS
function renderGS(path, file, sendAck){
	gs()
		.batch()
		.quiet()
		.nopause()
		.device('png16m')
		.textalphabits(4)
		.graphicsalphabits(4)
		.resolution(72)
		.input(path+'/'+file)
		.output(path+'/page_%d.png')
		.exec(function(err, stdout, stderr) {
			if (err) {
				logger.error(err, logSource)
			}
			else {
				logger.info(stdout, logSource)

				var pageNames = fs.readdirSync(path).filter(function(file) {
					return (file.indexOf('.png') != -1)
				}).map(function(file) {
					return file.substring(0, file.lastIndexOf('.png'))
				})
				queueClient.queue({type:'move', dest: path, pageNames:pageNames})
			}
			sendAck() //Send ack only when ok?
		})
}

function renderGS_CL(path, file, sendAck){
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
			queueClient.queue({type:'move-cl', dest: path, pageNames:pageNames})
		}
		sendAck()

	})
}