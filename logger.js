var winston = require('winston')

require('winston-loggly')

var logger = new winston.Logger ({
  transports: [
    new (winston.transports.Console)(),
    new (winston.transports.File)({ filename: 'tiling.log' })
  ]
})

module.exports = logger