import mongoose from 'mongoose';

const categoryPricingSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Category name is required for pricing tier'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required for category tier'],
      min: [0, 'Price cannot be negative'],
    },
  },
  { _id: false }
);

const showSchema = new mongoose.Schema(
  {
    eventListing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventListing',
      required: [true, 'EventListing reference is required'],
      index: true,
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: [true, 'Venue reference is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Show date is required'],
      index: true,
    },
    startTime: {
      type: String,
      required: [true, 'Show start time is required (e.g. 19:30)'],
      trim: true,
    },
    categoryPricing: {
      type: [categoryPricingSchema],
      required: [true, 'Show pricing per seat category is required'],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'A show must have at least one category pricing configuration',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['scheduled', 'ongoing', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid show status',
      },
      default: 'scheduled',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying upcoming shows by event and date
showSchema.index({ eventListing: 1, date: 1, status: 1 });
showSchema.index({ venue: 1, date: 1 });

const Show = mongoose.models.Show || mongoose.model('Show', showSchema);

export default Show;
