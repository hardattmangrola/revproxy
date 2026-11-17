const { performance } = require("perf_hooks");

class TokenBucketRateLimiter {
    constructor(capacity = 10, refillRate = 5) {
        this.capacity = capacity;
        this.refillRate = refillRate;

        // Store token bucket state per client
        this.clients = new Map();
    }
    allowRequest(clientId) {

        const now = performance.now();
        let bucket = this.clients.get(clientId);

        // Initialize a new client's bucket
        if (!bucket) {
            bucket = {
                tokens: this.capacity,
                lastRefill: now
            };
        }

        // Calculate elapsed time
        const elapsed = (now - bucket.lastRefill) / 1000;

        // Refill tokens
        bucket.tokens = Math.min(
            this.capacity,
            bucket.tokens + elapsed * this.refillRate
        );

        bucket.lastRefill = now;

        // Check token availability
        if (bucket.tokens >= 1) {

            bucket.tokens -= 1;

            this.clients.set(clientId, bucket);

            return {
                allowed: true,
                remaining: Math.floor(bucket.tokens)
            };
        }

        // Calculate time until next token
        const retryAfter = Math.ceil(
            (1 - bucket.tokens) / this.refillRate
        );

        this.clients.set(clientId, bucket);

        return {
            allowed: false,
            remaining: 0,
            retryAfter
        };
    }
}

module.exports = TokenBucketRateLimiter;
