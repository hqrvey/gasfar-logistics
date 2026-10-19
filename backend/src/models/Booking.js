import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
    bookingID: {
        type: String,
        required: true, 
    },
    customerID: {
        type: String,
        required: true,
    },
    driverID: {
        type: String,
        required: true,
    },
    vehicleID: {
        type: String,
        required: true,
    }
});

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;