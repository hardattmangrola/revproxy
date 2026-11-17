const http=require("http");
const CHECK_INTERVAL=5000;
const CHECK_TIMEOUT=3000;
const FAILURE_THRESHOLD=3;
const RECOVERY_THRESHOLD=2;

function checkInstance(instance){
    // Don't run overlapping health checks
    if(instance.checking){
        return;
    }
    instance.checking=true;
    instance.lastChecked=new Date();
    const options={
        hostname: instance.host,
        port:instance.port,
        path:"/health",
        agent: false
    };
    const req=http.request(options,(res)=>{
        //consume response body
        res.resume();
        const healthy=res.statusCode>=200 &&
                      res.statusCode<300
        finishCheck(instance, healthy);
    });
    req.setTimeout(CHECK_TIMEOUT, ()=>{
        req.destroy(new Error("Health check timeout!"));
    });
    req.on("error",()=>{
        finishCheck(instance,false);
    });
    req.end();
}

function finishCheck(instance, healthy){
    // Prevent multiple completion events from changing state
    if(!instance.checking){
        return;
    }
    instance.checking=false;
    if(healthy){
        instance.failures=0;
        instance.successes++;
        if(!instance.healthy && instance.successes>=RECOVERY_THRESHOLD){
            instance.healthy=true;
            console.log(`[HEALTH] ${instance.id} recovered`);
        }
    }else{
        instance.successes=0;
        instance.failures++;
        if(instance.healthy && instance.failures>=FAILURE_THRESHOLD){
            instance.healthy=false;
            console.log(`[HEALTH] ${instance.id} marked UNHEALTHY`);
        }
    }
    console.log(
        `[Health] ${instance.id}: ${instance.healthy ? "UP" : "DOWN"} | failures=${instance.failures} | successes=${instance.successes}`
    );
}
function startHealthChecks(services){
    const instances=Object.values(services)
        .flatMap(service=>service.instances);

    // Check immediately on startup
    instances.forEach(checkInstance);
    // Continue checking periodically
    const timer=setInterval(()=>{
        instances.forEach(checkInstance);
    },CHECK_INTERVAL);

    return()=>clearInterval(timer);
}

module.exports = {
    startHealthChecks,
    checkInstance
};