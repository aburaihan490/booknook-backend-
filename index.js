import express from 'express';
import 'dotenv/config';
import { connectDb } from './db/mongodb.js';
import cors from 'cors';
const app = express();
const port = process.env.PORT || 4000;

let db;

// Middlewares
app.use(express.json());
app.use(cors());

// Routes
app.get('/all-books', async (req, res) => {
    const books = await db.collection('books').find().toArray();

    res.send(books);
});

// Add a new book api
app.post('/add-book', async (req, res) => {
    try {
        const newBook = req.body;

        const result = await db.collection('books').insertOne(newBook);

        return res.status(201).json({
            message: 'Book added successfully',
            bookId: result,
        });
    } catch (error) {
        res.status(500).json({
            message: 'Failed to add book',
            error: error.message,
        });
    }
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Start server after MongoDB connection
const startServer = async () => {
    try {
        db = await connectDb();

        app.listen(port, () => {
            console.log(`Example app listening on port ${port}`);
        });
    } catch (error) {
        console.error('Server startup failed:', error);
    }
};

startServer();
