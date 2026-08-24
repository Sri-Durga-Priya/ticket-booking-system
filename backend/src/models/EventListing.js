import mongoose from 'mongoose';

const eventListingSchema = new mongoose.Schema(
  {
    organiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organiser reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Event type is required'],
      enum: {
        values: ['movie', 'concert'],
        message: '{VALUE} is not a valid event type (movie | concert)',
      },
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    posterUrl: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const EventListing = mongoose.models.EventListing || mongoose.model('EventListing', eventListingSchema);

export default EventListing;
