import * as THREE from 'three';

const HANDOFF_SECONDS=.15;
const RETENTION=1.2;
type Slot={source:number;pending:number;gain:number};

/** Camera-local approximation for performance mode; High retains the original rig. */
export class ShipLightBudget {
  readonly proxies:THREE.PointLight[];
  private slots:Slot[]=[];
  private high=true;
  private aboard=true;
  private initialize=true;
  constructor(readonly sources:readonly THREE.PointLight[],count=4){
    this.proxies=Array.from({length:Math.min(count,sources.length)},()=>new THREE.PointLight(0xffffff,0));
    this.configure(true,true);
  }
  configure(high:boolean,aboard:boolean){
    if(high!==this.high||aboard!==this.aboard)this.initialize=true;
    this.high=high;this.aboard=aboard;
    for(const light of this.sources)light.visible=high&&aboard;
    // Keep the shader light count constant, including during fade-to-zero handoffs.
    for(const light of this.proxies)light.visible=!high&&aboard;
  }
  update(camera:THREE.Vector3,dt:number){
    if(this.high||!this.aboard)return;
    const retained=new Set(this.slots.map(s=>s.pending>=0?s.pending:s.source));
    const selected=this.sources.map((light,index)=>{
      const distance2=light.position.distanceToSquared(camera);
      const cutoff=light.distance>0?Math.max(0,1-(distance2/(light.distance*light.distance))**2)**2:1;
      return {index,score:light.intensity*(cutoff+.02)/(1+distance2)*(retained.has(index)?RETENTION:1)};
    }).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,this.proxies.length).map(s=>s.index);
    if(this.initialize){this.slots=selected.map(source=>({source,pending:-1,gain:1}));this.initialize=false;}
    else {
      // Preserve slots for retained sources rather than swapping them when ranks change.
      const wanted=new Set(selected);
      for(const slot of this.slots)if(wanted.has(slot.source)){slot.pending=-1;wanted.delete(slot.source);}
      for(const slot of this.slots)if(!selected.includes(slot.source)){
        if(wanted.has(slot.pending))wanted.delete(slot.pending);else slot.pending=-1;
      }
      for(const slot of this.slots)if(!selected.includes(slot.source)&&slot.pending<0){
        const next=wanted.values().next().value as number|undefined;
        if(next!==undefined){slot.pending=next;wanted.delete(next);}
      }
      for(const slot of this.slots){
        let remaining=Math.max(0,dt);
        if(slot.pending>=0){
          const fadeTime=slot.gain*HANDOFF_SECONDS;
          if(remaining<fadeTime){slot.gain-=remaining/HANDOFF_SECONDS;remaining=0;}
          else{remaining-=fadeTime;slot.gain=0;slot.source=slot.pending;slot.pending=-1;}
        }
        if(slot.pending<0)slot.gain=Math.min(1,slot.gain+remaining/HANDOFF_SECONDS);
      }
    }
    this.slots.forEach((slot,index)=>{
      const source=this.sources[slot.source],proxy=this.proxies[index];
      proxy.position.copy(source.position);proxy.color.copy(source.color);
      proxy.intensity=source.intensity*slot.gain;proxy.distance=source.distance;proxy.decay=source.decay;
    });
  }
  snapshot(){return {sources:this.sources.length,visibleSources:this.sources.filter(l=>l.visible).length,visibleProxies:this.proxies.filter(l=>l.visible).length,slots:this.slots.map((s,i)=>({...s,intensity:this.proxies[i].intensity,color:this.proxies[i].color.getHex()}))};}
}
