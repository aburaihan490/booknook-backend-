import express from 'express';
import 'dotenv/config';
import { connectDb } from './db/mongodb.js';
import cors from 'cors';
import { ObjectId } from 'mongodb';
import { verifyToken } from './middleware/verifyUser.js';

const app = express();
const port = process.env.PORT || 5000;

let db;

// Middlewares
app.use(express.json());
app.use(cors());

// all books GET api
app.get('/all-books', async (req, res) => {
    const books = await db.collection('books').find().toArray();

    res.send(books);
});

// Add a new book Create api
app.post('/add-book', verifyToken, async (req, res) => {
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

// Get a single book by ID
app.get('/book/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                message: 'Invalid book ID',
            });
        }

        const book = await db.collection('books').findOne({
            _id: new ObjectId(id),
        });

        if (!book) {
            return res.status(404).json({
                message: 'Book not found',
            });
        }

        return res.status(200).json({
            book,
        });
    } catch (error) {
        console.error('Get book error:', error);

        return res.status(500).json({
            message: 'Failed to fetch book',
        });
    }
});

// Get books by user email
app.get('/my-books/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const books = await db.collection('books').find({ userId }).toArray();

        return res.status(200).json(books);
    } catch (error) {
        console.error('Get my books error:', error);

        return res.status(500).json({
            message: 'Failed to fetch user books',
        });
    }
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
