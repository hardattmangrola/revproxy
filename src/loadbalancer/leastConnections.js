const isEligible = require("./eligibility");

class LeastConnections{
    select(instances){
        const available=instances.filter(isEligible);
        if(available.length===0){
            return null;
        }
        return available.reduce((least,current)=>{
            if(current.activeConnections<least.activeConnections){
                return current;
            }
            return least;
        });
    }
}
module.exports=LeastConnections;