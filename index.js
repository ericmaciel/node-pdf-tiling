var express = require('express'),
	multer  = require('multer'),
	fs = require('fs'),
	Canvas = require('canvas'),
	PDFJS = require('./lib/pdf.js'),
	PDFReader = require('./lib/reader.js').PDFReader

PDFJS.disableWorker = true

var app = express()
app.use(
	multer({
		dest:'./uploads',
		onFileUploadStart: function (file) {
			console.log(file.originalname + ' is starting ...')
		},
		onFileUploadComplete: function (file) {
			console.log(file.fieldname + ' uploaded to  ' + file.path)
	}}))

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html')
})

app.post('/upload',function(req,res){
	var fileName = req.files.file.name
	var destFolder = __dirname + '/uploads/' + fileName.substring(0, fileName.indexOf('.pdf'))
	fs.mkdirSync(destFolder)

	var pdf = new PDFReader(__dirname + '/' + req.files.file.path)
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
