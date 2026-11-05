import express from 'express';
import 'dotenv/config';
import { connectDb } from './db/mongodb.js';
import cors from 'cors';
import { ObjectId } from 'mongodb';
import { verifyToken } from './middleware/verifyUser.js';
import { upload } from './middleware/multer.js';
import { uploadImage } from './lib/cloudinary.js';
import fs from 'fs';

const app = express();
const port = process.env.PORT || 5000;

let db;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    }),
);

// all books GET api
app.get('/all-books', async (req, res) => {
    const books = await db.collection('books').find().toArray();

    res.send(books);
});

// Add a new book Create api
app.post('/add-book', verifyToken, upload.single('cover'), async (req, res) => {
    try {
        const newBook = req.body;
        const newBookimg = req.file;

        // image filed check
        if (!newBookimg) {
            return res.status(400).json({ message: 'Cover image is required' });
        }

        const maxSize = 2 * 1024 * 1024;
        if (newBookimg.size > maxSize) {
            if (fs.existsSync(newBookimg.path)) {
                fs.unlinkSync(newBookimg.path); // ফাইল বড় হলে লোকাল ফোল্ডার থেকে মুছে ফেলুন
            }
            return res
                .status(400)
                .json({ message: 'File size too large. Maximum size is 2MB.' });
        }

        // Cloudinary upload cover Image
        const coverImageUrl = await uploadImage(newBookimg.path);

        const bookData = {
            ...newBook,
            cover: coverImageUrl.secureUrl, // Cloudinary secure URL সেভ হবে
            coverId: coverImageUrl.publicId, // Cloudinary secure URL সেভ হবে
            rating: newBook.rating ? parseFloat(newBook.rating) : 0,
            copies: newBook.copies ? parseInt(newBook.copies) : 0,
            createdAt: new Date(),
        };
        const result = await db.collection('books').insertOne(bookData);

        return res.status(201).json({
            message: 'Book added successfully',
            bookId: result,
        });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
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
app.get('/my-books/:userId', verifyToken, async (req, res) => {
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
// Delete a book by ID
app.delete('/delete-book/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                message: 'Invalid book ID',
            });
        }

        const result = await db.collection('books').deleteOne({
            _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: 'Book not found',
            });
        }

        return res.status(200).json({
            message: 'Book deleted successfully',
        });
    } catch (error) {
        console.error('Delete book error:', error);

        return res.status(500).json({
            message: 'Failed to delete book',
        });
    }
});

// Update a book by ID
app.put('/update-book/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updatedBook = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                message: 'Invalid book ID',
            });
        }

        const result = await db
            .collection('books')
            .updateOne({ _id: new ObjectId(id) }, { $set: updatedBook });

        if (result.matchedCount === 0) {
            return res.status(404).json({
                message: 'Book not found',
            });
        }

        return res.status(200).json({
            message: 'Book updated successfully',
        });
    } catch (error) {
        console.error('Update book error:', error);

        return res.status(500).json({
            message: 'Failed to update book',
        });
    }
});

// Borrow Added by ID
app.post('/add-borrow/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid book ID',
            });
        }

        if (!user?.email) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized user',
            });
        }

        // Check existing Borrow
        const existingBorrow = await db.collection('borrows').findOne({
            bookId: new ObjectId(id),
            userId: user.id,
        });

        if (existingBorrow) {
            return res.status(409).json({
                success: false,
                message: 'You have already borrowed this book',
            });
        }

        // Check copies and decrease by 1
        const book = await db.collection('books').findOneAndUpdate(
            {
                _id: new ObjectId(id),
                copies: { $gt: 0 },
            },
            {
                $inc: { copies: -1 },
            },
            {
                returnDocument: 'after',
            },
        );

        if (!book) {
            return res.status(400).json({
                success: false,
                message: 'Book is unavailable',
            });
        }

        try {
            const borrowDate = new Date();
            const returnDate = new Date(borrowDate);
            returnDate.setDate(returnDate.getDate() + 7);

            const borrowData = {
                bookId: book._id,
                title: book.title,
                author: book.author,
                cover: book.cover,
                userEmail: user.email,
                userId: user.id,
                borrowDate,
                returnDate,
            };

            await db.collection('borrows').insertOne(borrowData);

            return res.status(201).json({
                success: true,
                message: 'Book borrowed successfully',
            });
        } catch (error) {
            // If borrow insert fails, restore copies
            await db
                .collection('books')
                .updateOne({ _id: book._id }, { $inc: { copies: 1 } });

            throw error;
        }
    } catch (error) {
        console.error('Borrow book error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to borrow book',
        });
    }
});

// Get all Borrow by user ID
app.get('/all-borrow', verifyToken, async (req, res) => {
    try {
        const user = req.user;

        if (!user?.id) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized user',
            });
        }

        const borrow = await db
            .collection('borrows')
            .find({ userId: user.id })
            .toArray();

        res.status(200).json({
            success: true,
            message: 'Borrow books fetched successfully',
            data: borrow,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to Get all borrow book',
        });
    }
});

// user boorow book return
app.delete('/delete-borrow/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid borrow ID',
            });
        }

        if (!user?.email) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized user',
            });
        }

        // Find borrow record belonging to this user
        const borrow = await db.collection('borrows').findOne({
            _id: new ObjectId(id),
            userEmail: user.email,
        });

        if (!borrow) {
            return res.status(404).json({
                success: false,
                message: 'Borrow record not found',
            });
        }

        // Increase original book copies by 1
        const updateBook = await db.collection('books').updateOne(
            {
                _id: new ObjectId(borrow.bookId),
            },
            {
                $inc: { copies: 1 },
            },
        );

        if (updateBook.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Original book not found',
            });
        }

        // Delete borrow record
        await db.collection('borrows').deleteOne({
            _id: new ObjectId(id),
            userEmail: user.email,
        });

        return res.status(200).json({
            success: true,
            message: 'Book returned successfully',
        });
    } catch (error) {
        console.error('Return book error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to return book',
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

export default app;
