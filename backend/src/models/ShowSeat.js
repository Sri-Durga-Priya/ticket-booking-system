import mongoose from 'mongoose';

const showSeatSchema = new mongoose.Schema(
  {
    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show',
      required: [true, 'Show reference is required'],
      index: true,
    },
    seatId: {
      type: String,
      required: [true, 'Seat ID is required (e.g. A1)'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Seat category is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['available', 'held', 'booked'],
        message: '{VALUE} is not a valid seat status',
      },
      default: 'available',
      index: true,
    },
    heldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    holdExpiresAt: {
      type: Date,
      default: null,
      index: true, // Used by background TTL sweep job
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL CONCURRENCY INDEX: Unique compound index on (show, seatId)
// Guarantees zero duplicate seats per show at the database level
showSeatSchema.index({ show: 1, seatId: 1 }, { unique: true });

// Compound index for querying seats by status and expiry
showSeatSchema.index({ show: 1, status: 1 });
showSeatSchema.index({ status: 1, holdExpiresAt: 1 });

const ShowSeat = mongoose.models.ShowSeat || mongoose.model('ShowSeat', showSeatSchema);

export default ShowSeat;
