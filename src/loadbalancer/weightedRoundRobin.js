const isEligible = require("./eligibility");

class WeightedRoundRobin{
    constructor(){
        this.currentWeights=new Map();
    }
    select(instances){
        const available=instances.filter(
            instance=>
                isEligible(instance) &&
                Number.isFinite(instance.weight) &&
                instance.weight>0
        );
        if(available.length===0){
            return null;
        }
        let totalWeight=0;
        let selected=null;
        let maxWeight=-Infinity;
        const activeIds=new Set(
            available.map(instance=>instance.id)
        );
        // Remove stale state for unavailable instances
        for(const id of this.currentWeights.keys()){
            if(!activeIds.has(id)){
                this.currentWeights.delete(id);
            }
        }
        for(const instance of available){
            const current=(this.currentWeights.get(instance.id) || 0)+ instance.weight;
            this.currentWeights.set(instance.id,current);
            totalWeight+=instance.weight;
            if(current>maxWeight){
                maxWeight=current;
                selected=instance;
            }
        }
        // Reduce selected instance's curr weight
        this.currentWeights.set(
            selected.id,
            this.currentWeights.get(selected.id)-totalWeight 
        );
        return selected;
    }
}
module.exports=WeightedRoundRobin;