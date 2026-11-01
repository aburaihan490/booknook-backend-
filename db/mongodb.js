import { MongoClient, ServerApiVersion } from 'mongodb';
import 'dotenv/config';

const uri = process.env.MONGODB_URL;

if (!uri) {
    throw new Error('MONGODB_URL is missing from .env file');
}

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

export async function connectDb() {
    try {
        await client.connect();

        // Get Database instance
        const db = client.db('booknook');

        // Check database connection
        await db.command({ ping: 1 });
        console.log('MongoDB connected successfully!');

        return db;
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        throw error;
    }
}
