const mongoose = require('mongoose');

const ScanHistorySchema = new mongoose.Schema(
  {
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessContact',
      default: null,
      index: true,
    },
    originalOcrText: {
      type: String,
      default: '',
    },
    extractedJson: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      default: 'SUCCESS',
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

ScanHistorySchema.virtual('id').get(function () {
  return this._id.toString();
});

const ScanHistory =
  mongoose.models.ScanHistory || mongoose.model('ScanHistory', ScanHistorySchema);

module.exports = ScanHistory;

