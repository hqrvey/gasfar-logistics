import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import bookingRoutes from './routes/bookingRoutes.js';

const app = express();
dotenv.config();

app.use(express.json());
app.use("/api/bookings", bookingRoutes);

async function startServer() {
    await connectDB();

    const PORT = process.env.PORT || 5001;

    app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    });
}

startServer();