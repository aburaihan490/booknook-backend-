import multer from 'multer';
import crypto from 'crypto';
import path from 'path';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads'); // প্রজেক্টের রুট ফোল্ডারে 'uploads' ফোল্ডারে সেভ হবে
    },
    filename: function (req, file, cb) {
        crypto.randomBytes(16, function (err, raw) {
            if (err) return cb(err);
            const ext = path.extname(file.originalname);
            cb(null, file.fieldname + '-' + raw.toString('hex') + ext);
        });
    },
});

export const upload = multer({
    storage: storage,
    // limits: {
    //     fileSize: 2 * 1024 * 1024, // Maximum 2MB
    // },
});
