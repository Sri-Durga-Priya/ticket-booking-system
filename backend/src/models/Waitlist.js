import mongoose from 'mongoose';

const waitlistSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required'],
      index: true,
    },
    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show',
      required: [true, 'Show reference is required'],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Seat category is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['waiting', 'offered', 'claimed', 'completed', 'expired', 'cancelled'],
        message: '{VALUE} is not a valid waitlist status',
      },
      default: 'waiting',
      index: true,
    },
    offeredSeat: {
      type: String,
      default: null,
    },
    claimToken: {
      type: String,
      default: null,
    },
    offerExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL WAITLIST INDEX: Efficient "Next in Line" priority queue index
waitlistSchema.index({ show: 1, category: 1, status: 1, joinedAt: 1 });

// Prevent duplicate active waitlist entries for same customer on same show and category
waitlistSchema.index(
  { customer: 1, show: 1, category: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['waiting', 'offered'] } },
  }
);

const Waitlist = mongoose.models.Waitlist || mongoose.model('Waitlist', waitlistSchema);

export default Waitlist;
