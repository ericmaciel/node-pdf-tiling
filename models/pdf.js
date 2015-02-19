var mongoose = require('mongoose')
	, Schema = mongoose.Schema
  , timestamps = require('mongoose-timestamp')
	, logger = require('../logger.js')
	, logSource = { source: 'model' }

var PdfSchema = new Schema({
	name: {type: String, required: true},
	folder: {type:String, required:true},
	pages: {type: Number,required:true},
	steps: {type: Number,required:true},
	completedAt: Date,
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


/*
 * Export
 */

mongoose.model('Pdf', PdfSchema)
module.exports = PdfSchema