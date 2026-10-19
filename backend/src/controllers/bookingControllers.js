import Booking from '../models/Booking.js';

export async function getBookings(req, res) {
    try {
        const bookings = await Booking.find();
        res.status(200).json(bookings);
    }
    catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: error.message });
    }
}