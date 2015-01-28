var	Canvas = require('canvas'),
	fs = require('fs'),
	PDFJS = require('./lib/pdf.js'),
	PDFReader = require('./lib/reader.js').PDFReader,
	queueClient = require('./queue/client.js')

exports.render = function(path, file, sendAck){
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
				console.log('Finished rendering page ' + pageNum)
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
		console.log('something went wrong :/')
		throw err
	}
}

function getPagePictureFolderPath(path, pageNum){
	return path + '/page_' + pageNum
}
