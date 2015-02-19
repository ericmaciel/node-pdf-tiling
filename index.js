var express = require('express'),
	multer  = require('multer'),
	fs = require('fs'),
	gm = require('gm'),
	queueClient = require('./queue/client.js'),
	exec = require('child_process').exec,
	logger = require('./logger.js'),
	mongoose = require('mongoose')

var app = express()

require('./mongoose.js')
var PDF = mongoose.model('Pdf')

app.use(
		multer({
		dest:'./uploads',
		rename: function(fieldname, fileName){
			return Date.now()
		},
		onFileUploadStart: function (file) {
			logger.info('Uploading ' + file.originalname + ' ...')
		},
		onFileUploadComplete: function (file) {
			logger.info(file.fieldname + ' uploaded to  ' + file.path)
		}}
))

var server = app.listen(3000, function () {
  var host = server.address().address
  var port = server.address().port
  logger.info('Example app listening at http://%s:%s', host, port)
})

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html')
})

//Get all filenames available
app.get('/files', function(req, res){
	var files = fs.readdirSync(__dirname + '/uploads/').filter(function(file) {
		return /^\d+$/.test(file);
	})
	res.status(200).send(files)
})

//Get pdf
app.get('/files/:id?', function(req, res){
	var filename = req.params.id
	var path = __dirname+'/uploads/'+filename + '/' + filename + '.pdf'
	fs.exists(path, function(exists){
		if(exists){
			res.sendFile(path)
		}else{
			var err = 'file['+path+'] doesnt exists'
			logger.error(err)
			res.send(err)
		}
	})
})

//Get pdf pageNum
app.get('/files/:id/pages', function(req, res){
	var filename = req.params.id
	var path = __dirname+'/uploads/'+filename
	fs.exists(path, function(exists){
		if(exists){
			var files = fs.readdirSync(path).filter(function(file) {
				return file.indexOf('page_') == -1;
			})
			res.status(200).send({numPages:files.length-1})
		}else{
			var err = 'file['+filename+'] doesnt exists'
			logger.error(err)
			res.send(err)
		}
	})
})

//Get tile
app.get('/files/:id/:page?', function(req, res){
	var filename = req.params.id,
		page = req.params.page,
		zoom = req.query.zoom || 100,
		row = req.query.row || 0,
		col = req.query.col || 0

	logger.info('Get tile file['+filename+'], page['+page+'], zoom['+zoom+'], row['+row+'], col['+col+']')

	var path =  __dirname+'/uploads/'+filename+'/page_'+page+'/'+'zoom_'+zoom+'/tile_'+row+'_'+col+'.png'
	fs.exists(path, function(exists){
		if(exists){
			res.sendFile(path)
		}else{
			var err = 'file['+path+'] doesnt exists'
			logger.error(err)
			res.send(err)
		}
	})
})

//Get zoom info
app.get('/files/:id/:page/:zoom/info', function(req, res){
	var file = req.params.id,
		page = req.params.page,
		zoom = req.params.zoom

	logger.info('Get zoom info file['+file+'], page['+page+'], zoom['+zoom+']')
	var err = 'Unable to find file['+file+'], page['+page+'], zoom['+zoom+'] info'
	var path = __dirname + '/uploads/' + file + '/page_' + page + '/zoom_' + zoom + '/resize.png'
	fs.exists(path, function(exists){
		if(exists){
			gm(path).size(function(err, value){
				if(err){
					logger.error(err)
					res.send(err)
				}
				res.send(value)
			})
		}else{
			logger.error(err)
			res.send(err)
		}
	})
})

app.post('/upload', function(req,res){
	var filename = req.files.file.name,
		path = req.files.file.path,
		dest = __dirname + '/uploads/' + filename.substring(0, filename.indexOf('.pdf')),
		moved = dest+'/'+filename

	fs.mkdirSync(dest)
	fs.renameSync(path, moved)



	var command = 'gs -q -dNODISPLAY -c "('+moved+') (r) file runpdfbegin pdfpagecount = quit"'
	exec(command, function(error, stdout, strerr) {
		if(error) {
			res.send('File uploaded successfully - error counting pages')
		}else{
			var numPages = parseInt(stdout)
			var numSteps = numPages*10 + 1

			
				var file = new PDF({name : filename, folder : dest, pages: numPages, steps:numSteps})
				file.save(function(err, saved){
					if(err){
						logger.error('Error saving file')
						res.send('Error')
					}else{
						logger.info(file._id)
						logger.info('Queueing process file['+saved._id+']')
						queueClient.queue({type: 'process', path:dest, file:filename, id:saved._id})
						res.send('File uploaded successfully - '+numPages+' page(s) - '+numSteps+' steps required')
					}
				})
		}
	})
})
