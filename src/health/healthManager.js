const FAILURE_THRESHOLD = 3;

function recordFailure(instance, reason) {
    instance.passiveFailures =
        (instance.passiveFailures || 0) + 1;
    console.log(
        `[Passive Health] ${instance.id} failure: ${reason}`
    );
    if (instance.passiveFailures >= FAILURE_THRESHOLD) {
        if (instance.healthy) {
            instance.healthy = false;
            console.log(
                `[Passive Health] ${instance.id} marked UNHEALTHY`
            );
        }
    }
}

function recordSuccess(instance) {
    instance.passiveFailures = 0;
}

module.exports = {
    recordFailure,
    recordSuccess
};
