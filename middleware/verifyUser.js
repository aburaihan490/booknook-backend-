import { createRemoteJWKSet, jwtVerify } from 'jose';

export const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];

        const JWKS = createRemoteJWKSet(
            new URL(`${process.env.FRONTEND_URL}/api/auth/jwks`),
        );

        const { payload } = await jwtVerify(token, JWKS);
        req.user = payload; // req.user save the data payload
        next();
    } catch (error) {
        return res.status(401).json({
            message: 'Unauthorized, Internal Server Error',
            error: error.message,
        });
    }
};
