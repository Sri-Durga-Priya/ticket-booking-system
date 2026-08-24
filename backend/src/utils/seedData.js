import User from '../models/User.js';
import Venue from '../models/Venue.js';
import EventListing from '../models/EventListing.js';
import Show from '../models/Show.js';
import ShowSeat from '../models/ShowSeat.js';
import { generateGridSeats } from '../controllers/venueController.js';

/**
 * Automatically seeds demo accounts, venues, event listings, and shows if not present
 */
export const seedDefaultData = async () => {
  try {
    // 1. Seed Users
    const usersToSeed = [
      {
        name: 'Alex Administrator',
        email: 'admin@ticketnow.local',
        phone: '+1 (555) 019-2831',
        password: 'password123',
        role: 'admin',
        isVerified: true,
      },
      {
        name: 'Orion Events & Studios',
        email: 'organiser@ticketnow.local',
        phone: '+1 (555) 014-9922',
        password: 'password123',
        role: 'organiser',
        isVerified: true,
      },
      {
        name: 'Alice Customer',
        email: 'customer@ticketnow.local',
        phone: '+1 (555) 018-3344',
        password: 'password123',
        role: 'customer',
        isVerified: true,
      },
      {
        name: 'Bob Waitlist User',
        email: 'bob@ticketnow.local',
        phone: '+1 (555) 012-7788',
        password: 'password123',
        role: 'customer',
        isVerified: true,
      },
    ];

    let adminUser = null;
    let organiserUser = null;

    for (const userData of usersToSeed) {
      let user = await User.findOne({ email: userData.email });
      if (!user) {
        const passwordHash = await User.hashPassword(userData.password);
        user = await User.create({
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          passwordHash,
          role: userData.role,
          isVerified: userData.isVerified,
        });
        console.log(`[Seed] Seeded default ${userData.role} user: ${userData.email}`);
      }
      if (user.role === 'admin' && !adminUser) adminUser = user;
      if (user.role === 'organiser' && !organiserUser) organiserUser = user;
    }

    // 2. Seed Default Venues
    let venues = await Venue.find();
    if (venues.length === 0 && adminUser) {
      const venuesToSeed = [
        {
          name: 'Grand Dolby Cinema 1',
          address: '742 Evergreen Terrace, Downtown',
          city: 'Metropolis',
          categories: [
            { name: 'Standard', colorTag: '#10b981' },
            { name: 'Premium', colorTag: '#6366f1' },
            { name: 'VIP Recliner', colorTag: '#ec4899' },
          ],
          rowConfigs: [
            { row: 'A', seats: 8, category: 'VIP Recliner' },
            { row: 'B', seats: 8, category: 'VIP Recliner' },
            { row: 'C', seats: 10, category: 'Premium' },
            { row: 'D', seats: 10, category: 'Premium' },
            { row: 'E', seats: 10, category: 'Standard' },
            { row: 'F', seats: 10, category: 'Standard' },
          ],
          createdBy: adminUser._id,
        },
        {
          name: 'Starlight Symphony & Concert Arena',
          address: '1000 Broadway Symphony Blvd',
          city: 'New York',
          categories: [
            { name: 'Balcony', colorTag: '#3b82f6' },
            { name: 'Orchestra', colorTag: '#8b5cf6' },
            { name: 'Front VIP Pit', colorTag: '#ec4899' },
          ],
          rowConfigs: [
            { row: 'A', seats: 12, category: 'Front VIP Pit' },
            { row: 'B', seats: 12, category: 'Front VIP Pit' },
            { row: 'C', seats: 14, category: 'Orchestra' },
            { row: 'D', seats: 14, category: 'Orchestra' },
            { row: 'E', seats: 16, category: 'Balcony' },
          ],
          createdBy: adminUser._id,
        },
        {
          name: 'IMAX Galaxy Dome',
          address: '404 Cyberway Parkway',
          city: 'San Francisco',
          categories: [
            { name: 'Standard IMAX', colorTag: '#10b981' },
            { name: 'Prime Center', colorTag: '#f59e0b' },
          ],
          rowConfigs: [
            { row: 'A', seats: 8, category: 'Prime Center' },
            { row: 'B', seats: 8, category: 'Prime Center' },
            { row: 'C', seats: 8, category: 'Standard IMAX' },
            { row: 'D', seats: 8, category: 'Standard IMAX' },
          ],
          createdBy: adminUser._id,
        },
      ];

      for (const vData of venuesToSeed) {
        const layout = generateGridSeats(vData.rowConfigs);
        const createdV = await Venue.create({
          name: vData.name,
          address: vData.address,
          city: vData.city,
          categories: vData.categories,
          seatLayout: layout,
          totalCapacity: layout.length,
          createdBy: vData.createdBy,
        });
        venues.push(createdV);
        console.log(`[Seed] Seeded venue: ${vData.name} with ${layout.length} seats (${vData.city})`);
      }
    }

    // 3. Seed Event Listings
    const eventCount = await EventListing.countDocuments();
    let events = [];
    if (eventCount === 0 && (organiserUser || adminUser)) {
      const orgId = organiserUser?._id || adminUser._id;

      const eventsToSeed = [
        {
          title: 'Inception: 15th Anniversary IMAX Special',
          type: 'movie',
          description: 'Experience Christopher Nolan’s mind-bending masterpiece remastered in stunning IMAX 70mm and Dolby Atmos surround sound.',
          posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
          organiser: orgId,
          isActive: true,
        },
        {
          title: 'Dune: Part Two — Epic Large Screen Experience',
          type: 'movie',
          description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
          posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
          organiser: orgId,
          isActive: true,
        },
        {
          title: 'Coldplay: Music of the Spheres World Tour Live',
          type: 'concert',
          description: 'The record-breaking stadium spectacle featuring spectacular lasers, pyrotechnics, and kinetic dance floors.',
          posterUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
          organiser: orgId,
          isActive: true,
        },
        {
          title: 'Hans Zimmer Live — Cinematic Symphonies',
          type: 'concert',
          description: 'A multi-award-winning orchestral showcase performing the iconic music of Interstellar, The Dark Knight, Inception, and Gladiator.',
          posterUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80',
          organiser: orgId,
          isActive: true,
        },
      ];

      for (const evData of eventsToSeed) {
        const createdEv = await EventListing.create(evData);
        events.push(createdEv);
        console.log(`[Seed] Seeded event: ${createdEv.title} (${createdEv.type})`);
      }
    } else {
      events = await EventListing.find();
    }

    // 4. Seed Shows with Auto-Initialized ShowSeats
    const showCount = await Show.countDocuments();
    if (showCount === 0 && events.length > 0 && venues.length > 0) {
      const now = Date.now();
      const oneDay = 86400000;

      const showsToSeed = [
        {
          eventListing: events[0]._id, // Inception
          venue: venues[0]._id, // Grand Dolby Cinema
          date: new Date(now + oneDay * 2),
          startTime: '19:30',
          categoryPricing: [
            { category: 'VIP Recliner', price: 28 },
            { category: 'Premium', price: 20 },
            { category: 'Standard', price: 15 },
          ],
        },
        {
          eventListing: events[0]._id, // Inception
          venue: venues[2]._id, // IMAX Galaxy
          date: new Date(now + oneDay * 3),
          startTime: '21:00',
          categoryPricing: [
            { category: 'Prime Center', price: 26 },
            { category: 'Standard IMAX', price: 18 },
          ],
        },
        {
          eventListing: events[2]._id, // Coldplay
          venue: venues[1]._id, // Starlight Arena
          date: new Date(now + oneDay * 5),
          startTime: '20:00',
          categoryPricing: [
            { category: 'Front VIP Pit', price: 150 },
            { category: 'Orchestra', price: 95 },
            { category: 'Balcony', price: 55 },
          ],
        },
        {
          eventListing: events[3]._id, // Hans Zimmer
          venue: venues[1]._id, // Starlight Arena
          date: new Date(now + oneDay * 7),
          startTime: '19:00',
          categoryPricing: [
            { category: 'Front VIP Pit', price: 135 },
            { category: 'Orchestra', price: 85 },
            { category: 'Balcony', price: 45 },
          ],
        },
      ];

      for (const sData of showsToSeed) {
        const venueDoc = await Venue.findById(sData.venue);
        const newShow = await Show.create({
          eventListing: sData.eventListing,
          venue: sData.venue,
          date: sData.date,
          startTime: sData.startTime,
          categoryPricing: sData.categoryPricing,
          status: 'scheduled',
        });

        // Initialize ShowSeats for this Show
        if (venueDoc && venueDoc.seatLayout) {
          const showSeats = venueDoc.seatLayout.map((seat) => ({
            show: newShow._id,
            seatId: seat.seatId,
            category: seat.category,
            status: 'available',
            heldBy: null,
            holdExpiresAt: null,
            booking: null,
            version: 0,
          }));
          await ShowSeat.insertMany(showSeats);
          console.log(`[Seed] Seeded show for date ${newShow.date.toISOString().split('T')[0]} with ${showSeats.length} initialized ShowSeats`);
        }
      }
    }
  } catch (error) {
    console.warn('[Seed] Note during default data seeding:', error.message);
  }
};
