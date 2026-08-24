import mongoose from 'mongoose';

const bookedSeatSchema = new mongoose.Schema(
  {
    seatId: {
      type: String,
      required: [true, 'Seat ID is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Seat category is required'],
      trim: true,
    },
    priceAtBooking: {
      type: Number,
      required: [true, 'Price snapshot at booking time is required'],
      min: [0, 'Seat price cannot be negative'],
    },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
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
    seats: {
      type: [bookedSeatSchema],
      required: [true, 'At least one seat must be included in the booking'],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'A booking must contain at least one seat',
      },
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    bookingReference: {
      type: String,
      required: [true, 'Unique booking reference is required (e.g. TN-ABC1234)'],
      unique: true,
      trim: true,
      index: true,
    },
    qrCodePayload: {
      type: String,
      required: [true, 'QR code payload string is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['confirmed', 'cancelled'],
        message: '{VALUE} is not a valid booking status',
      },
      default: 'confirmed',
      index: true,
    },
    source: {
      type: String,
      enum: {
        values: ['direct', 'waitlist'],
        message: '{VALUE} is not a valid booking source (direct | waitlist)',
      },
      default: 'direct',
    },
    bookedAt: {
      type: Date,
      default: Date.now,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying customer bookings by date
bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ show: 1, status: 1 });

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

export default Booking;
