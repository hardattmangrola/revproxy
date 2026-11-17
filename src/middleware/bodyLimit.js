const { Transform } = require("stream");

function createBodyLimit(maxBytes) {
    let receivedBytes = 0;

    return new Transform({
        transform(chunk, encoding, callback) {
            receivedBytes += chunk.length;

            if (receivedBytes > maxBytes) {
                const error = new Error("Request body too large");
                error.code = "BODY_TOO_LARGE";
                return callback(error);
            }

            callback(null, chunk);
        }
    });
}

module.exports = createBodyLimit;
