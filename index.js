var express = require('express'),
	fs = require('fs'),
	multer  = require('multer'),
	Canvas = require('canvas'),
	PDFJS = require('./lib/pdf.js'),
	PDFReader = require('./lib/reader.js').PDFReader,
	gm = require('gm')

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
	res.end('File uploaded and converted')

	var pdf = new PDFReader(savedFile)
	pdf.on('error', errorDumper);
	pdf.on('ready', function(pdf) {
		// Render all pages.
		pdf.renderAll({
			scale: 4, //TODO work on that number
			bg: true,
			output: function(pageNum) {
				return destFolder + '/page' + pageNum + '.png'
			}
			}, function(pageNum){

				var pageFolder = destFolder + '/page_' + pageNum
				var pageFile = 'page' + pageNum + '.png';
				var pageOriginal = pageFolder + '/' + pageFile
				fs.mkdirSync(pageFolder)
				fs.renameSync(destFolder + '/' + pageFile, pageOriginal)


				var zoom75 = pageFolder + '/page1_75.png'
				copyFile(pageOriginal, zoom75, function(err){
					if(err){
						console.log('Error copying file')
						throw err;
					}
					gm(zoom75).resize(75, '%')
				})
				console.log('Finished page['+pageNum+']')

			}, errorDumper)
	});
});

function errorDumper(err) {
	if (err) {
		console.log('something went wrong :/')
		throw err
	}
}

function renderCallback(page){
	console.log('Finished page['+page+']')
	//fs.mkdirSync(destFolder)

	//TODO
	//create page folder
	//Resize page file into levels zoom
	//Split each zoom level into tiles
}

var server = app.listen(3000, function () {
  var host = server.address().address
  var port = server.address().port
  console.log('Example app listening at http://%s:%s', host, port)
})


function copyFile(source, target, cb) {
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on("error", function(err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on("error", function(err) {
    done(err);
  });
  wr.on("close", function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
}