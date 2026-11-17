const allowedIPs = new Set([
    "127.0.0.1",
    "::1",
    "::ffff:127.0.0.1"
]);

const blockedIPs = new Set([
    "192.0.2.100"
]);

function normalizeIP(ip = "") {
    return ip.startsWith("::ffff:")
        ? ip.slice(7)
        : ip;
}

function checkIP(req, res) {
    const ip = normalizeIP(req.socket.remoteAddress);

    if (blockedIPs.has(ip)) {
        res.writeHead(403, {
            "Content-Type": "application/json"
        });
        res.end(JSON.stringify({
            error: "Forbidden",
            message: "IP address blocked"
        }));
        return false;
    }

    if (!allowedIPs.has(ip)) {
        res.writeHead(403, {
            "Content-Type": "application/json"
        });
        res.end(JSON.stringify({
            error: "Forbidden",
            message: "IP address not allowed"
        }));
        return false;
    }
    return true;
}

module.exports = checkIP;
