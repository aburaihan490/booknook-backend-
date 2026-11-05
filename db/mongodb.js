import { MongoClient, ServerApiVersion } from 'mongodb';
import 'dotenv/config';

const uri = process.env.MONGODB_URL;

if (!uri) {
    throw new Error('MONGODB_URL is missing from .env file');
}

let client;
let clientPromise;

// গ্লোবাল ভেরিয়েবল ব্যবহার করা যাতে Vercel-এর কোল্ড স্টার্টে বারবার নতুন ক্লায়েন্ট তৈরি না হয়
if (process.env.NODE_ENV === 'development') {
    // ডেভেলপমেন্ট মোডে গ্লোবাল ভেরিয়েবল ব্যবহার করা ভালো যেন হট রিলোডে সমস্যা না হয়
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
        });
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    // প্রডাকশন (Vercel) মোডের জন্য
    client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
    });
    clientPromise = client.connect();
}

export async function connectDb() {
    try {
        const connectedClient = await clientPromise;

        // Get Database instance
        const db = connectedClient.db('booknook');

        return db;
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        throw error;
    }
}
