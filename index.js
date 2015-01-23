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
			return Date.now()
		},
		onFileUploadStart: function (file) {
			console.log(file.originalname + ' is starting ...')
		},
		onFileUploadComplete: function (file) {
			console.log(file.fieldname + ' uploaded to  ' + file.path)
		}}
))

var server = app.listen(3000, function () {
  var host = server.address().address
  var port = server.address().port
  console.log('Example app listening at http://%s:%s', host, port)
})

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html')
})

//Get all filenames available
app.get('/files', function(req, res){
	var files = fs.readdirSync(__dirname + '/uploads/')
	res.status(200).send(files)
})

//Get pdf
app.get('/files/:id?', function(req, res){
	var filename = req.params.id
	var path = __dirname+'/uploads/'+filename
	fs.exists(path, function(exists){
		if(exists){
			res.sendFile(__dirname+'/uploads/'+filename+'/'+filename+'.pdf')
		}else{
			res.send('file['+filename+'] doesnt exists')
		}
	})
})

//Get page picture file
app.get('/files/:id/:page?', function(req, res){
	var filename = req.params.id,
		page = req.params.page,
		zoom = req.query.zoom || 100,
		row = req.query.row || 0,
		col = req.query.col || 0

	var path =  __dirname+'/uploads/'+filename+'/page_'+page+'/'+'zoom_'+zoom+'/tile_'+row+'_'+col+'.png'
	fs.exists(path, function(exists){
		if(exists){
			res.sendFile(path)
		}else{
			res.send('file['+filename+'] doesnt exists')
		}
	})
})

//Get zoom info
app.get('/files/:id/:page/:zoom/info', function(req, res){
	var file = req.params.id,
		page = req.params.page,
		zoom = req.params.zoom

	var path = __dirname + '/uploads/' + file + '/page_' + page + '/zoom_' + zoom + '/resize.png'
	fs.exists(path, function(exists){
		if(exists){
			gm(path).size(function(err, value){
				if(err)
					res.send('Unable to find file['+file+'], page['+page+'], zoom['+zoom+'] info')

				res.send(value)
			})
		}else{
			res.send('Unable to find file['+file+'], page['+page+'], zoom['+zoom+'] info')
		}
	})
})

app.post('/upload',function(req,res){
	var filename = req.files.file.name,
		path = req.files.file.path,
		dest = __dirname + '/uploads/' + filename.substring(0, filename.indexOf('.pdf')),
		moved = dest+'/'+filename

	fs.mkdirSync(dest)
	fs.renameSync(path, moved)

	res.send('File uploaded successfully')

	var pdf = new PDFReader(moved)
	pdf.on('error', errorCallback);
	pdf.on('ready', function(pdf) {
		// Render all pages.
		pdf.renderAll({
			bg: true,
			scaleBounds: [3000, 3000],
			output: function(pageNum) {
				var path = getPagePictureFolderPath(dest, pageNum)
				fs.mkdirSync(path)
				return path + '/page' + pageNum + '.png'
			}
			}, function(pageNum){
				var zooms = [100,75,50,25]

				var buf = fs.readFileSync(getPagePictureFolderPath(dest, pageNum) + '/page' + pageNum + '.png')
				for(var i=0;i<zooms.length;i++){
					resizeAndCrop(buf, dest, pageNum, zooms[i])
				}
			}, errorCallback)
	});
});

function errorCallback(err) {
	if (err) {
		console.log('something went wrong :/')
		throw err
	}
}

function getPagePictureFolderPath(path, pageNum){
	return path + '/page_' + pageNum
}

function resizeAndCrop(buf, dest, pageNum, zoom){
	var folder = getPagePictureFolderPath(dest, pageNum) + '/zoom_' + zoom
	var resized = folder + '/resize.png'
	fs.mkdirSync(folder)
	gm(buf).resize(zoom, zoom, '%').write(resized, function(err){
		if(err)throw err
		crop(folder, resized)
	})
}

function crop(zoomFolder, resized){
	gm(resized).size(function(err, value){
		if(err)throw err

		var rows = Math.ceil(value.height / 256)
		var columns = Math.ceil(value.width / 256)
		var px=0,py=0
		for(var i=0;i<rows;i++){
			for(var j=0;j<columns;j++){
				gm(resized).crop(256,256, px, py).write(zoomFolder+'/tile_'+i+'_'+j+'.png', function(err){
					if (err) return console.dir(arguments)
				})
				px+=256
			}
			px=0
			py+=256
		}
	})
}