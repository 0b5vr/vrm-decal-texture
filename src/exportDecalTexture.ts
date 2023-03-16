import * as THREE from 'three';
import { textureUVGrid } from './textureUVGrid';

const _v2A = new THREE.Vector2();
const v4DecalRect = new THREE.Vector4();

const mapMaterial = new THREE.MeshBasicMaterial( { map: textureUVGrid } ); // set dummy texture
mapMaterial.onBeforeCompile = ( shader ) => {
  shader.uniforms.decalRect = new THREE.Uniform( v4DecalRect );

  shader.vertexShader = 'uniform vec4 decalRect;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
    '#include <project_vertex>',
    `
#include <project_vertex>

vec4 p = gl_Position;

gl_Position = vec4( vUv * 2.0 - 1.0, 0.0, 1.0 );
gl_Position.y = -gl_Position.y;
vUv = 0.5 + 0.5 * p.xy / p.w;
vUv = ( vUv - decalRect.xy ) / ( decalRect.zw - decalRect.xy );
vUv.y = 1.0 - vUv.y;
    `
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <map_fragment>',
    `
if ( vUv.x < 0.0 || 1.0 < vUv.x || vUv.y < 0.0 || 1.0 < vUv.y ) {
  discard;
}

#include <map_fragment>
    `
  );
};

export async function exportDecalTexture( {
  canvas,
  renderer,
  camera,
  scene,
  mesh,
  width,
  height,
  rect,
  imageUrl,
}: {
  canvas: HTMLCanvasElement,
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  scene: THREE.Scene,
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

  if ( prevMap ) {
    prevMap.dispose();
  }

  // render
  renderer.compile( scene, camera );
  renderer.clear();
  renderer.renderBufferDirect(
    camera,
    scene,
    mesh.geometry,
    mapMaterial,
    mesh,
    mesh.geometry.groups[ 0 ] ?? null
  );

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
