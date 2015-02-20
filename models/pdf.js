var mongoose = require('mongoose')
	, Schema = mongoose.Schema
  , timestamps = require('mongoose-timestamp')
	, logger = require('../logger.js')
	, logSource = { source: 'model' }
	, _ = require('lodash')

var PdfSchema = new Schema({
	name: {type: String, required: true},
	folder: {type:String, required:true},
	pages: {type: Number,required:true},
	steps: {type: Number,required:true},
	completedAt: Date,
	zoom: [Number]
}, {
  toObject: {},
  toJSON: {
    transform: function (doc, ret, options) {}
  }
})

PdfSchema.plugin(timestamps)

/*
 * Class methods
 */
PdfSchema.statics.decrementStep = function(id){
	var PDF = this
	PDF.findById(id).exec(function(err, pdf){
		if(err){
			logger.error(err, logSource)
		}else if(pdf){
			pdf.steps--
			if(pdf.steps==0){
				logger.info('Completed ['+id+']')
				pdf.completedAt = Date.now()
			}
			pdf.save(function(err, saved){
				if(err){
					logger.error(err, logSource)
				}else{
					logger.info('Decremented step on['+id+']', logSource)
				}
			})
		}
	})
}

PdfSchema.statics.addZoom = function(id, zoom){
	var PDF = this
	PDF.findById(id).exec(function(err, pdf){
		if(err){
			logger.error(err, logSource)
		}else if(pdf){
			if(pdf.zoom){
				var index = _.indexOf(pdf.zoom, zoom)
				if(index==-1){
					pdf.zoom.push(zoom)
				}else{
					return
				}
			}else{
				pdf.zoom = [zoom]
			}
			pdf.save(function(err, saved){
				if(err){
					logger.error(err, logSource)
				}else{
					logger.info('Added zoom['+zoom+'] on['+id+']', logSource)
				}
			})
		}
	})
}

PdfSchema.statics.findByName = function(name, files){
	var PDF = this
	PDF.find({name : name}).exec(files)
}

/*
 * Virtual getters and setters
 */
 PdfSchema.virtual('pageInfo').get(function(){
 	var pageInfo = {}
 	pageInfo.filename = this.name
 	pageInfo.pages = this.pages
 	return pageInfo
 })

/*
 * Export
 */

mongoose.model('Pdf', PdfSchema)
module.exports = PdfSchema