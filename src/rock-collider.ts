import RAPIER from '@dimforge/rapier3d-compat';
import {ROCK_HULL_VERTICES} from './rock-hull';
export type RockObstacle={x:number;y:number;z:number;scale:[number,number,number];rotation:{x:number;y:number;z:number;w:number}};
export function createRockCollider(world:RAPIER.World,rock:RockObstacle,offsetX=0){
 const points=Float32Array.from(ROCK_HULL_VERTICES,(v,i)=>v*rock.scale[i%3]);
 return world.createCollider(RAPIER.ColliderDesc.convexHull(points)!.setTranslation(rock.x+offsetX,rock.y,rock.z).setRotation(rock.rotation));
}
