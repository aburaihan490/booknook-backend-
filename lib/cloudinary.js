import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config';

// config cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/////////////////////////
// Uploads an image file
/////////////////////////
export const uploadImage = async (imagePath) => {
    // Use the uploaded file's name as the asset's public ID and
    // allow overwriting the asset with new versions
    const options = {
        resource_type: 'image',
        quality: 'auto',
    };

    try {
        if (!imagePath || !fs.existsSync(imagePath)) {
            throw new Error('Image path missing');
        }
        // Upload the image
        const result = await cloudinary.uploader.upload(imagePath, options);

        // Delete local temporary file after successful upload
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
        return { publicId: result.public_id, secureUrl: result.secure_url };
    } catch (error) {
        if (imagePath && fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
        console.error('Image upload error:', error);
        throw error;
    }
};
