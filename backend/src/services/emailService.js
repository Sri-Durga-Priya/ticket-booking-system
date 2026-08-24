import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { Booking, Show, EventListing, Venue, User } from '../models/index.js';

let transporterPromise = null;

/**
 * Get or initialize Nodemailer Transporter
 */
const getTransporter = async () => {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    // Default to Ethereal Test Account for zero-config local testing
    try {
      const testAccount = await nodemailer.createTestAccount();
      console.log(`[Email] Created Ethereal test SMTP account: ${testAccount.user}`);
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (err) {
      console.warn('[Email] Falling back to JSON mock transporter:', err.message);
      return nodemailer.createTransport({ jsonTransport: true });
    }
  })();

  return transporterPromise;
};

/**
 * Generate QR code as Data URI / PNG Buffer
 */
export const generateQRCodeDataUrl = async (payload) => {
  const qrString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return await QRCode.toDataURL(qrString, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 240,
    color: {
      dark: '#111827',
      light: '#ffffff',
    },
  });
};

/**
 * Send official ticket confirmation email with embedded QR code
 */
export const sendTicketConfirmationEmail = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate({
        path: 'show',
        populate: [
          { path: 'eventListing', select: 'title type posterUrl description' },
          { path: 'venue', select: 'name address city' },
        ],
      })
      .populate('customer', 'name email');

    if (!booking) {
      console.warn(`[Email] Booking not found for ID ${bookingId}`);
      return null;
    }

    const show = booking.show;
    const event = show.eventListing;
    const venue = show.venue;
    const customer = booking.customer;
    const showDate = new Date(show.date).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // Generate high-resolution QR code Data URI
    const qrDataUrl = await generateQRCodeDataUrl(booking.qrCodePayload || booking.bookingReference);

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const verifyUrl = `${clientUrl}/verify/${booking.bookingReference}`;

    // Seats breakdown HTML table
    const seatsHtml = booking.seats
      .map(
        (s) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Seat ${s.seatId}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${s.category}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #059669;">$${s.priceAtBooking}</td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; padding: 24px; text-align: center; }
          .content { padding: 24px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; background: #e0e7ff; color: #3730a3; }
          .qr-box { text-align: center; padding: 20px; background: #f9fafb; border-radius: 8px; margin: 20px 0; border: 1px dashed #d1d5db; }
          .table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
          .footer { padding: 16px 24px; background: #f9fafb; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Ticket Booking System E-Ticket</h1>
            <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">Your Official Admission Pass</p>
          </div>
          
          <div class="content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <span class="badge">${event.type} Admission</span>
              <strong style="font-family: monospace; font-size: 16px; color: #4f46e5;">Ref: ${booking.bookingReference}</strong>
            </div>

            <h2 style="margin: 0 0 8px; font-size: 20px; color: #111827;">${event.title}</h2>
            <p style="margin: 0 0 4px; color: #4b5563; font-size: 14px;">📍 <strong>${venue.name}</strong>, ${venue.city}</p>
            <p style="margin: 0 0 16px; color: #4b5563; font-size: 14px;">📅 ${showDate} at <strong>${show.startTime}</strong></p>

            <div class="qr-box">
              <img src="${qrDataUrl}" alt="Entry QR Code" style="width: 180px; height: 180px; display: block; margin: 0 auto 8px; border-radius: 4px;" />
              <div style="font-weight: 700; font-size: 13px; color: #111827; letter-spacing: 0.05em;">SCAN AT ENTRANCE BOX OFFICE</div>
              <div style="font-size: 11px; color: #6b7280;">Valid for ${booking.seats.length} person(s)</div>
            </div>

            <h3 style="margin: 16px 0 8px; font-size: 15px; color: #111827;">Seat & Pricing Summary</h3>
            <table class="table">
              <thead>
                <tr style="background: #f9fafb; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">
                  <th style="padding: 8px 12px;">Seat</th>
                  <th style="padding: 8px 12px;">Category</th>
                  <th style="padding: 8px 12px; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${seatsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 12px; font-weight: 800; font-size: 15px;">Total Paid</td>
                  <td style="padding: 12px; font-weight: 800; font-size: 16px; text-align: right; color: #059669;">$${booking.totalAmount}</td>
                </tr>
              </tfoot>
            </table>

            <div style="text-align: center; margin-top: 20px;">
              <a href="${verifyUrl}" style="background: #4f46e5; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block;">
                Verify Ticket Online
              </a>
            </div>
          </div>

          <div class="footer">
            Ticket Booking System Platform &bull; Concurrency Protected &bull; Need help? support@ticketbooking.local
          </div>
        </div>
      </body>
      </html>
    `;

    const transporter = await getTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Ticket Booking System Support" <tickets@ticketbooking.local>',
      to: customer.email,
      subject: `🎟️ Your Tickets for ${event.title} [${booking.bookingReference}]`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Ticket confirmation sent to ${customer.email} (MsgID: ${info.messageId})`);

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Email Preview URL]: ${previewUrl}`);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error('[Email] Failed to send confirmation email:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send Waitlist Offer Email with private booking claim link
 */
export const sendWaitlistOfferEmail = async ({ customerEmail, customerName, eventTitle, showDate, startTime, category, claimLink, expiresAt }) => {
  try {
    const transporter = await getTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Ticket Booking System Waitlist" <waitlist@ticketbooking.local>',
      to: customerEmail,
      subject: `✨ Good News! A seat opened up for ${eventTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #4f46e5; margin-top: 0;">A Seat is Available For You!</h2>
          <p>Hi ${customerName},</p>
          <p>A ticket just became available for <strong>${eventTitle}</strong> on <strong>${showDate} at ${startTime}</strong> (${category} tier).</p>
          <p>Because you were next in line on the waitlist, you have an exclusive time-limited window to claim this seat:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${claimLink}" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; display: inline-block;">
              Claim Your Seat Now
            </a>
          </div>
          <p style="color: #ef4444; font-size: 13px;">⚠️ <strong>Offer expires at:</strong> ${new Date(expiresAt).toLocaleTimeString()} (15 minutes). If unclaimed, it will automatically cascade to the next person in line.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Waitlist offer sent to ${customerEmail}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log(`[Waitlist Email Preview]: ${previewUrl}`);
    return { success: true, previewUrl };
  } catch (error) {
    console.error('[Email] Failed to send waitlist email:', error.message);
    return { success: false, error: error.message };
  }
};
