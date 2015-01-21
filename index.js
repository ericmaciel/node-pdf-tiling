var express = require('express'),
	multer  = require('multer')

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
	console.log(req.files)
	res.end('File uploaded')
});

var server = app.listen(3000, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('Example app listening at http://%s:%s', host, port)

})
