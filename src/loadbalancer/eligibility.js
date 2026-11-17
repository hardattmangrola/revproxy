function isEligible(instance) {
    if (!instance.breaker) {
        return instance.healthy;
    }

    if (
        instance.breaker.state === "OPEN" ||
        instance.breaker.state === "HALF_OPEN"
    ) {
        return instance.breaker.canRequest();
    }

    return instance.healthy &&
           instance.breaker.canRequest();
}

module.exports = isEligible;
