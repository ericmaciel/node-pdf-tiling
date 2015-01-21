var express = require('express'),
	fs = require('fs'),
	multer  = require('multer'),
	Canvas = require('canvas'),
	PDFJS = require('./lib/pdf.js'),
	PDFReader = require('./lib/reader.js').PDFReader

PDFJS.disableWorker = true

var app = express()


app.use(
	multer({
		dest:'./uploads',
		rename: function(fieldname, fileName){
			return fileName.replace(/\W+/g, '-').toLowerCase() + '_' + Date.now()
		},
		onFileUploadStart: function (file) {
			console.log(file.originalname + ' is starting ...')
		},
		onFileUploadComplete: function (file) {
			console.log(file.fieldname + ' uploaded to  ' + file.path)
		}}
))


app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html')
})

app.post('/upload',function(req,res){
	var fileName = req.files.file.name
	var path = req.files.file.path
	var destFolder = __dirname + '/uploads/' + fileName.substring(0, fileName.indexOf('.pdf'))
	var savedFile = destFolder+'/'+fileName
	fs.mkdirSync(destFolder)

	fs.renameSync(path, savedFile)

	var pdf = new PDFReader(savedFile)
	pdf.on('error', errorDumper);
	pdf.on('ready', function(pdf) {
		// Render all pages.
		pdf.renderAll({

			bg: true,
			output: function(pageNum) {
				return destFolder + '/page' + pageNum + '.png'
			}
			}, errorDumper)
		res.end('File uploaded and converted')
	});
});

function errorDumper(err) {
  if (err) {
    console.log('something went wrong :/')
    throw err
  }
}

var server = app.listen(3000, function () {
  var host = server.address().address
  var port = server.address().port
  console.log('Example app listening at http://%s:%s', host, port)
})
