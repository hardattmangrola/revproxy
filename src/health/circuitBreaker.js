class CircuitBreaker {
    constructor(threshold = 3, cooldown = 10000) {
        this.threshold = threshold;
        this.cooldown = cooldown;
        this.state = "CLOSED";
        this.failures = 0;
        this.nextAttempt = 0;
        this.probeInFlight = false;
    }

    canRequest() {
        if (this.state === "CLOSED") {
            return true;
        }

        if (this.state === "OPEN") {
            if (Date.now() >= this.nextAttempt) {
                this.state = "HALF_OPEN";
                console.log("[Circuit] HALF_OPEN");
            } else {
                return false;
            }
        }

        if (this.state === "HALF_OPEN") {
            if (this.probeInFlight) {
                return false;
            }

            this.probeInFlight = true;
            return true;
        }

        return false;
    }

    success() {
        this.failures = 0;
        this.state = "CLOSED";
        this.probeInFlight = false;
        console.log("[Circuit] CLOSED");
    }

    failure() {
        this.failures++;
        this.probeInFlight = false;

        if (
            this.state === "HALF_OPEN" ||
            this.failures >= this.threshold
        ) {
            this.state = "OPEN";
            this.nextAttempt = Date.now() + this.cooldown;
            console.log("[Circuit] OPEN");
        }
    }
}

module.exports = CircuitBreaker;
