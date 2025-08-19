
const jwt = require('jsonwebtoken');
const JWT_TOKEN_KEY = process.env.JWT_SECRET ;


function JwtAuthMiddleware(req, res, next) {

    var header = req.headers['authorization'];
    if (!header) {
        return res.status(403).json({ error: 'No token provided' });
    }
    const token = header.split(" ")[1];

    jwt.verify(token, JWT_TOKEN_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid Token provided' + err });
        }
        next();
    });
}

module.exports = JwtAuthMiddleware;