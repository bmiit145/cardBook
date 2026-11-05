const mongoose = require('mongoose');

const CardImageSubSchema = new mongoose.Schema(
  {
    side: {
      type: String,
      enum: ['FRONT', 'BACK'],
      default: 'FRONT',
    },
    cloudinaryPublicId: {
      type: String,
      default: null,
    },
    cloudinaryAssetId: {
      type: String,
      default: null,
    },
    secureUrl: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
      },
    },
  }
);

CardImageSubSchema.virtual('id').get(function () {
  return this._id.toString();
});

const BusinessContactSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: null,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
    designation: {
      type: String,
      default: null,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    alternatePhone: {
      type: String,
      default: null,
      trim: true,
    },
    alternatePhones: {
      type: [String],
      default: [],
    },
    email: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    secondaryEmail: {
      type: String,
      default: null,
      trim: true,
    },
    website: {
      type: String,
      default: null,
      trim: true,
    },
    address: {
      type: String,
      default: null,
      trim: true,
    },
    city: {
      type: String,
      default: null,
      trim: true,
    },
    state: {
      type: String,
      default: null,
      trim: true,
    },
    country: {
      type: String,
      default: null,
      trim: true,
    },
    branches: {
      type: Array,
      default: [],
    },
    notes: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    images: {
      type: [CardImageSubSchema],
      default: [],
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

BusinessContactSchema.virtual('id').get(function () {
  return this._id.toString();
});

const BusinessContact =
  mongoose.models.BusinessContact || mongoose.model('BusinessContact', BusinessContactSchema);

module.exports = BusinessContact;

