import mongoose from 'mongoose';

const seatLayoutItemSchema = new mongoose.Schema(
  {
    seatId: {
      type: String,
      required: [true, 'Seat identifier is required (e.g. A1, B4)'],
      trim: true,
    },
    row: {
      type: String,
      required: [true, 'Row label is required (e.g. A, B)'],
      trim: true,
    },
    number: {
      type: Number,
      required: [true, 'Seat number is required'],
    },
    category: {
      type: String,
      required: [true, 'Seat category is required (e.g. VIP, Standard)'],
      trim: true,
    },
    x: {
      type: Number,
      required: [true, 'X grid coordinate is required for visual rendering'],
    },
    y: {
      type: Number,
      required: [true, 'Y grid coordinate is required for visual rendering'],
    },
  },
  { _id: false }
);

const venueCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    colorTag: {
      type: String,
      default: '#6366f1',
    },
  },
  { _id: false }
);

const venueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Venue name is required'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      index: true,
      trim: true,
    },
    categories: {
      type: [venueCategorySchema],
      default: [
        { name: 'Standard', colorTag: '#10b981' },
        { name: 'Premium', colorTag: '#6366f1' },
      ],
    },
    seatLayout: {
      type: [seatLayoutItemSchema],
      default: [],
    },
    totalCapacity: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Auto calculate totalCapacity before saving if seatLayout is provided
venueSchema.pre('save', function (next) {
  if (this.seatLayout && this.seatLayout.length > 0) {
    this.totalCapacity = this.seatLayout.length;
  }
  next();
});

const Venue = mongoose.models.Venue || mongoose.model('Venue', venueSchema);

export default Venue;
