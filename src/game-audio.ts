import {soundMix,type SoundState,type FootEvent,type FootSurface} from './soundscape';

/** Local synthesis: one reusable graph, a shared noise buffer, bounded one-shots. */
export class GameAudio{
 readonly output:GainNode;private readonly ship:GainNode;private readonly wind:GainNode;private readonly motor:GainNode;private readonly rolling:GainNode;
 private readonly engine:OscillatorNode;private readonly harmonic:OscillatorNode;private readonly rollingSource:AudioBufferSourceNode;private readonly motorFilter:BiquadFilterNode;
 private readonly noise:AudioBuffer;private readonly voices=new Set<()=>void>();private lastFoot=-Infinity;private lastMix?:ReturnType<typeof soundMix>;
 private muted=true;private footsteps=0;private landings=0;private cues=0;private dropped=0;
 constructor(private readonly context:BaseAudioContext){
  this.output=context.createGain();this.output.gain.value=0;
  const limiter=context.createDynamicsCompressor();limiter.threshold.value=-14;limiter.knee.value=12;limiter.ratio.value=6;limiter.attack.value=.003;limiter.release.value=.1;this.output.connect(limiter);limiter.connect(context.destination);
  const bus=()=>{const g=context.createGain();g.gain.value=0;g.connect(this.output);return g;};this.ship=bus();this.wind=bus();this.motor=bus();this.rolling=bus();
  for(const frequency of [48,72]){const o=context.createOscillator();o.frequency.value=frequency;o.connect(this.ship);o.start();}
  this.noise=context.createBuffer(1,context.sampleRate*2,context.sampleRate);const data=this.noise.getChannelData(0);let seed=9137;
  for(let i=0;i<data.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;data[i]=(seed>>>0)/2147483648-1;}
  const noise=(gain:GainNode,frequency:number,type:BiquadFilterType)=>{const source=context.createBufferSource(),filter=context.createBiquadFilter();source.buffer=this.noise;source.loop=true;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.6;source.connect(filter);filter.connect(gain);source.start();return source;};
  noise(this.wind,500,'lowpass').playbackRate.value=.65;this.rollingSource=noise(this.rolling,900,'bandpass');
  this.motorFilter=context.createBiquadFilter();this.motorFilter.type='lowpass';this.motorFilter.frequency.value=450;this.motorFilter.connect(this.motor);
  this.engine=context.createOscillator();this.engine.type='triangle';this.engine.frequency.value=62;this.engine.connect(this.motorFilter);this.engine.start();
  this.harmonic=context.createOscillator();this.harmonic.type='sine';this.harmonic.frequency.value=124;const harmonicGain=context.createGain();harmonicGain.gain.value=.25;this.harmonic.connect(harmonicGain);harmonicGain.connect(this.motorFilter);this.harmonic.start();
 }
 mute(value:boolean){this.muted=value;this.output.gain.cancelScheduledValues(this.context.currentTime);this.output.gain.setValueAtTime(value?0:1,this.context.currentTime);if(value){for(const dispose of this.voices)dispose();this.lastFoot=-Infinity;}}
 update(state:SoundState){
  const mix=soundMix(state),t=this.context.currentTime;this.lastMix=mix;
  for(const [param,value]of [[this.ship.gain,mix.ship],[this.wind.gain,mix.wind],[this.motor.gain,mix.motor],[this.rolling.gain,mix.rolling],[this.engine.frequency,mix.frequency],[this.harmonic.frequency,mix.frequency*2],[this.rollingSource.playbackRate,mix.rollingRate],[this.motorFilter.frequency,350+mix.frequency*2]] as [AudioParam,number][]){param.cancelScheduledValues(t);param.setTargetAtTime(value,t,.08);}
 }
 private voice(sources:AudioScheduledSourceNode[],nodes:AudioNode[],end:number){
  let disposed=false;const dispose=()=>{if(disposed)return;disposed=true;for(const s of sources){try{s.stop();}catch{/* already ended */}}for(const node of [...sources,...nodes])node.disconnect();this.voices.delete(dispose);};
  this.voices.add(dispose);sources[0].onended=dispose;for(const source of sources){source.start();source.stop(end);}return dispose;
 }
 foot(event:FootEvent,surface:FootSurface){
  const t=this.context.currentTime;if(this.muted)return;if(t-this.lastFoot<.08||this.voices.size>=8){this.dropped++;return;}this.lastFoot=t;
  const context=this.context,source=context.createBufferSource(),osc=context.createOscillator(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=this.noise;source.playbackRate.value=surface==='wet'?.65:1;
  const duration=event.kind==='land'?.24:.14;filter.type='lowpass';filter.frequency.value={metal:2200,sand:750,stone:1600,wet:450}[surface];filter.Q.value=.7;
  osc.type='sine';osc.frequency.setValueAtTime(surface==='metal'?120:surface==='stone'?95:65,t);osc.frequency.exponentialRampToValueAtTime(35,t+duration);
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime((event.kind==='land'?.065:.035)*event.strength,t+.004);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  source.connect(filter);osc.connect(filter);filter.connect(gain);gain.connect(this.output);this.voice([source,osc],[filter,gain],t+duration+.01);if(event.kind==='land')this.landings++;else this.footsteps++;
 }
 cue(frequency:number){
  if(this.muted||!Number.isFinite(frequency)||frequency<=0||this.voices.size>=8)return;
  const t=this.context.currentTime,o=this.context.createOscillator(),gain=this.context.createGain();o.frequency.value=Math.min(frequency,4000);gain.gain.setValueAtTime(.035,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.3);o.connect(gain);gain.connect(this.output);this.voice([o],[gain],t+.31);this.cues++;
 }
 snapshot(){return {muted:this.muted,mix:this.lastMix?{...this.lastMix}:null,voices:this.voices.size,footsteps:this.footsteps,landings:this.landings,cues:this.cues,dropped:this.dropped};}
}
