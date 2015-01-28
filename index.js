var express = require('express'),
	multer  = require('multer'),
	fs = require('fs'),
	gs = require("ghostscript"),
	gm = require('gm'),
	exec = require('child_process').exec

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
			res.sendFile(path+'/'+filename+'.pdf')
		}else{
			res.send('file['+filename+'] doesnt exists')
		}
	})
})

//Get pdf pageNum
app.get('/files/:id/pages', function(req, res){
	var filename = req.params.id
	var path = __dirname+'/uploads/'+filename
	fs.exists(path, function(exists){
		if(exists){
			var files = fs.readdirSync(path)
			res.status(200).send({numPages:files.length-1})
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

	var path =  __dirname+'/uploads/'+filename+'/page_'+page+'/'+'page'+page+'_'+zoom+'/page'+page+'_'+zoom+'_'+row+'_'+col+'.png'
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

	var path = __dirname + '/uploads/' + file + '/page_' + page + '/page' + page + '_' + zoom + '/page' + page + '_' + zoom + '.png'
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

	gs()
		.batch()
		.quiet()
		.nopause()
		.device('png16m')
		.textalphabits(4)
		.graphicsalphabits(4)
		.resolution(144)
		.input(moved)
		.output(dest+'/page%d.png')
		.exec(function(err, stdout, stderr) {
			if (err) {
				console.log(err)
			}
			else {
				console.log(stdout)

				var pageNames = fs.readdirSync(dest).filter(function(file) {
					return (file.indexOf('.png') != -1)
				}).map(function(file) {
					return file.substring(0, file.lastIndexOf('.png'))
				})

				processPageFiles(dest, pageNames)
			}
		})
});

function processPageFiles(baseDir, pageNames) {
	var zoomLevels = [1, 2, 4, 8]
	pageNames.forEach(function(pageName) {
		var path = baseDir + '/' + pageName,
			pageFile = path + '/' + pageName + '.png'
		fs.mkdirSync(path)
		fs.renameSync(path + '.png', pageFile)
		for (var i = 0; i < zoomLevels.length; i++) {
			zoomAndTilePage(path, pageFile, pageName, zoomLevels[i])
		};
	})
}

function zoomAndTilePage(pageDir, pageFile, pageName, zoomLevel) {
	var percent = 100/zoomLevel,
		zoomedPageName =  pageName + '_' + (percent * 10),
		zoomedPath = pageDir + '/' + zoomedPageName,
		zoomedFile = zoomedPath + '/' + zoomedPageName + '.png'
	fs.mkdirSync(zoomedPath)

	exec('convert ' + pageFile + ' -resize ' + percent + '% ' + zoomedFile, function (error, stdout, stderr) {
		if (error) {
			console.log(error);
		}
		else {
			console.log('page ' + pageName + ' zoomed');
			tileZoomedPage(zoomedPath, zoomedFile, zoomedPageName)
		}
	});

	// gm(pageFile)
	// 	.options({imageMagick: true})
	// 	.resize(percent, percent, '%')
	// 	.write(zoomedFile, function(err) {
	// 		if (err) throw err
	// 		tileZoomedPage(zoomedPath, zoomedFile, zoomedPageName)
	// 	})
}

function tileZoomedPage(zoomedPath, zoomedFile, zoomedPageName) {

	exec('convert ' + zoomedFile + ' -crop 256x256 -set filename:tile "%[fx:page.y/256]_%[fx:page.x/256]" +repage +adjoin "' + zoomedPath + '/' + zoomedPageName + '_%[filename:tile].png"', function (error, stdout, stderr) {
		if (error) {
			console.log(error);
		}
		else {
			console.log('page ' + zoomedPageName + ' tiled');
		}
	});

	// gm(zoomedFile)
	// 	.options({imageMagick: true})
	// 	.size(function(err, size) {
	// 		if (err) throw err

	// 		var tileSize = 256
	// 		var rows = Math.ceil(size.height / tileSize)
	// 		var cols = Math.ceil(size.width / tileSize)
	// 		var px = 0, py = 0
	// 		for(var i = 0; i < rows; i++){
	// 			for(var j = 0; j < cols; j++){
	// 				gm(zoomedFile)
	// 					.options({imageMagick: true})
	// 					.crop(tileSize, tileSize, px, py)
	// 					.write(zoomedPath + '/' + zoomedPageName + '_' + i + '_' + j + '.png', function(err){
	// 						if (err) throw err
	// 					})
	// 				px += tileSize
	// 			}
	// 			px = 0
	// 			py += tileSize
	// 		}
	// 	})
}
