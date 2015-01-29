module.exports = {
	connection: {
	  host: 'localhost',
	  //host: '172.30.0.107',
	  port: 5672
	},
	creds: {
	  user: 'guest',
	  pass: 'guest'
	},
	queue:{
		render: 'pdf-tiling-render',
		resize: 'pdf-tiling-resize',
		crop: 'pdf-tiling-crop'
	}
}