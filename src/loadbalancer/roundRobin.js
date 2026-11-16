class RoundRobin{
    constructor(){
        this.currentIndex=0;
    }
    select(instances){
        // Filter unavialble instance
        const available=instances.filter(
            instance=>instance.healthy
        );
        if(available.length===0){
            return null;
        }
        // Select current Index
        const selected=available[
            this.currentIndex%available.length
        ];
        // Move to next instance
        this.currentIndex=(this.currentIndex+1)%available.length;
        
        return selected;
    }
}
// Time complexity: O(n)
module.exports=RoundRobin;