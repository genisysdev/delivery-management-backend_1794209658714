import mongoose from 'mongoose';
import dotenv from 'dotenv';

const env = process.env.NODE_ENV || 'local';
dotenv.config({ path: `.env.${env}` });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log(`Connected to MongoDB successfully`);
  }
  catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    throw err;
  }
}

export default connectDB;
