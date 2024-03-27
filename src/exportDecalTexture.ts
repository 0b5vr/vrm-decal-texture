import * as THREE from 'three';
import { textureUVGrid } from './textureUVGrid';

const _v2A = new THREE.Vector2();
const v4DecalRect = new THREE.Vector4();

const mapMaterial = new THREE.MeshLambertMaterial( { map: textureUVGrid } ); // set dummy texture
mapMaterial.onBeforeCompile = ( shader ) => {
  shader.uniforms.decalRect = new THREE.Uniform( v4DecalRect );

  shader.vertexShader = `
uniform vec4 decalRect;
varying vec3 vViewNormal;
  ` + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
    '#include <project_vertex>',
    `
#include <project_vertex>

vec4 p = gl_Position;

gl_Position = vec4( vMapUv * 2.0 - 1.0, 0.0, 1.0 );
gl_Position.y = -gl_Position.y;
vMapUv = 0.5 + 0.5 * p.xy / p.w;
vMapUv = ( vMapUv - decalRect.xy ) / ( decalRect.zw - decalRect.xy );
vMapUv.y = 1.0 - vMapUv.y;

vViewNormal = -normalize( modelViewMatrix * vec4( normal, 0.0 ) ).xyz;
    `
  );

  shader.fragmentShader = `
varying vec3 vViewNormal;
  ` + shader.fragmentShader;

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <map_fragment>',
    `
if ( vMapUv.x < 0.0 || 1.0 < vMapUv.x || vMapUv.y < 0.0 || 1.0 < vMapUv.y ) {
  discard;
}

if ( vViewNormal.z < 0.0 ) {
  discard;
}

#include <map_fragment>
gl_FragColor = diffuseColor;

#include <colorspace_fragment>
return;
    `
  );
};

export async function exportDecalTexture( {
  canvas,
  renderer,
  camera,
  mesh,
  width,
  height,
  rect,
  imageUrl,
}: {
  canvas: HTMLCanvasElement,
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  mesh: THREE.Mesh,
  width: number,
  height: number,
  rect: { x: number, y: number, w: number, h: number },
  imageUrl: string,
} ): Promise<void> {
  // temporarily resize the render target to the texture size
  renderer.getSize( _v2A );
  const prevWidth = _v2A.x;
  const prevHeight = _v2A.y;
  renderer.setSize( width, height );

  // update the decal rect
  v4DecalRect.set(
    rect.x / window.innerWidth,
    1.0 - rect.y / window.innerHeight,
    ( rect.w + rect.x ) / window.innerWidth,
    1.0 - ( rect.h + rect.y ) / window.innerHeight
  );

  // update the texture
  const prevMap = mapMaterial.map;
  mapMaterial.map = await new THREE.TextureLoader().loadAsync( imageUrl );
  mapMaterial.map.colorSpace = THREE.SRGBColorSpace;

  if ( prevMap ) {
    prevMap.dispose();
  }

  // render
  const clonedMesh = mesh.clone();
  clonedMesh.matrix = mesh.matrixWorld.clone();
  clonedMesh.material = [ mapMaterial ];

  const scene = new THREE.Scene();
  scene.add( clonedMesh );

  renderer.clear();
  renderer.render( scene, camera );

  // save the canvas content
  canvas.toBlob( ( blob ) => {
    const url = URL.createObjectURL( blob! );
    const a = document.createElement( 'a' );
    a.download = `${ Date.now() }`;
    a.href = url;
    a.click();
    URL.revokeObjectURL( url );

    renderer.setSize( prevWidth, prevHeight );
  } );
}
