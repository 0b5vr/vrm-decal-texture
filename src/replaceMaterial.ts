import * as THREE from 'three';

export function replaceMaterial(
  root: THREE.Object3D,
  lookFor: THREE.Material,
  replaceWith: THREE.Material
): number {
  let count = 0;

  root.traverse( ( object ) => {
    if ( ( object as any ).isMesh ) {
      const mesh = object as THREE.Mesh;
      const materialOrArray = mesh.material;
      if ( Array.isArray( materialOrArray ) ) {
        mesh.material = materialOrArray.map( ( material ) => {
          if ( material === lookFor ) {
            count ++;
            return replaceWith;
          } else {
            return material;
          }
        } );
      } else {
        const temp = materialOrArray;
        if ( temp === lookFor ) {
          count ++;
          mesh.material = replaceWith;
        }
      }
    }
  } );

  return count;
}
