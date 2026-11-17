const crypto = require("crypto");
require('dotenv').config();
const API_KEY = process.env.AUTH_API_KEY;
function authenticate(req, res) {

    if (!API_KEY) {
        console.error("[Auth] API key is not configured");
        res.writeHead(503, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
            error: "Authentication unavailable"
        }));

        return false;
    }

    const authHeader = req.headers.authorization || "";
    const [scheme, suppliedKey] = authHeader.split(" ");

    if (
        scheme !== "Bearer" ||
        !suppliedKey
    ) {
        res.writeHead(401, {
            "Content-Type": "application/json",
            "WWW-Authenticate": "Bearer"
        });

        res.end(JSON.stringify({
            error: "Unauthorized",
            message: "Missing or invalid API key"
        }));

        return false;
    }

    const expected = Buffer.from(API_KEY);
    const supplied = Buffer.from(suppliedKey);

    // timingSafeEqual requires equal-length buffers
    const valid =
        expected.length === supplied.length &&
        crypto.timingSafeEqual(expected, supplied);

    if (!valid) {
        res.writeHead(401, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
            error: "Unauthorized",
            message: "Invalid API key"
        }));

        return false;
    }

    return true;
}

module.exports = authenticate;
