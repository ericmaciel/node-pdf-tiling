module.exports = {
	connection: {
	  host: 'localhost',
	  port: 5672
	},
	creds: {
	  user: 'guest',
	  pass: 'guest'
	},
	queue:{
		render: 'pdf-tiling-render'
	},
	mongo:{
		db: 'mongodb://localhost/tiling'
	}
}