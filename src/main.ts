import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { MeshPicker } from './MeshPicker';
import { VRM } from '@pixiv/three-vrm';
import { getImageSize } from './getImageSize';
import { registerMouseEvent } from './registerMouseEvent';
import CameraControls from 'camera-controls';
import threeVrmGirlVrm from './assets/models/three-vrm-girl.vrm';
import uvGridPng from './assets/uv-grid.png';

// esm please
CameraControls.install( { THREE } );

// == temp vars ====================================================================================
const _v2A = new THREE.Vector2();

// == dom ==========================================================================================
const canvas = document.getElementById( 'canvas' ) as HTMLCanvasElement;
const divDraggable = document.getElementById( 'divDraggable' ) as HTMLDivElement;
const divImageHandleNW = document.getElementById( 'divImageHandleNW' ) as HTMLDivElement;
const divImageHandleSE = document.getElementById( 'divImageHandleSE' ) as HTMLDivElement;
const inputTextureWidth = document.getElementById( 'inputTextureWidth' ) as HTMLInputElement;
const inputTextureHeight = document.getElementById( 'inputTextureHeight' ) as HTMLInputElement;
const buttonExport = document.getElementById( 'buttonExport' ) as HTMLInputElement;

// == renderer =====================================================================================
const width = window.innerWidth;
const height = window.innerHeight;

canvas.width = width;
canvas.height = height;

const renderer = new THREE.WebGLRenderer( {
  canvas,
  alpha: true,
  antialias: true,
} );

// == camera =======================================================================================
let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
camera = new THREE.OrthographicCamera(
  -2.5 / height * width,
  2.5 / height * width,
  2.5,
  -2.5,
  0.1,
  100.0,
);
camera = new THREE.PerspectiveCamera(
  30.0,
  window.innerWidth / window.innerHeight,
  0.1,
  100.0,
);
camera.position.set( 0.0, 1.0, 5.0 );

const controls = new CameraControls( camera, canvas );
controls.setTarget( 0.0, 1.0, 0.0 );

// == scene ========================================================================================
const scene = new THREE.Scene();

// == light ========================================================================================
const light = new THREE.DirectionalLight( 0xffffff );
light.position.set( 1.0, 2.0, 3.0 ).normalize();
scene.add( light );

// == vrm ==========================================================================================
let currentVRM: GLTF | VRM | null = null;
const gltfLoader = new GLTFLoader();

async function loadVRM( url: string ): Promise<GLTF | VRM> {
  const gltf = await gltfLoader.loadAsync( url );
  const vrm = await VRM.from( gltf ).catch( ( error ) => {
    console.error( error );
    console.warn( 'Failed to load the model as a VRM. Fallbacking to GLTF' );
    return null;
  } );

  if ( vrm ) {
    vrm.scene.rotation.y = Math.PI;
  }

  if ( currentVRM ) {
    scene.remove( currentVRM.scene );
    currentVRM = null;
  }

  currentVRM = vrm ?? gltf;
  scene.add( currentVRM.scene );

  return currentVRM;
}

loadVRM( threeVrmGirlVrm );

// == material picker ==============================================================================
const meshPicker = new MeshPicker( renderer );
meshPicker.scene = scene;
meshPicker.camera = camera;

// == select mesh ==================================================================================
const textureUVGrid = new THREE.TextureLoader().load( uvGridPng );
const materialSelectedOverride = new THREE.MeshBasicMaterial( { map: textureUVGrid } );

let selectedMesh: THREE.Mesh | null | undefined;
let selectedMeshOriginalMaterial: THREE.Material | THREE.Material[] | null | undefined;

function unselectMesh(): void {
  if (
    currentVRM == null ||
    selectedMesh == null ||
    selectedMeshOriginalMaterial == null
  ) { return; }

  selectedMesh.material = selectedMeshOriginalMaterial;

  selectedMesh = null;
  selectedMeshOriginalMaterial = null;
}

function selectMesh( mesh: THREE.Mesh ): void {
  if ( currentVRM == null ) { return; }

  if ( selectedMesh != null ) {
    unselectMesh();
  }

  selectedMesh = mesh;
  selectedMeshOriginalMaterial = mesh.material;

  if ( Array.isArray( mesh.material ) ) {
    mesh.material = mesh.material.map( () => materialSelectedOverride );
  } else {
    mesh.material = materialSelectedOverride;
  }
}

// == helpers ======================================================================================
const gridHelper = new THREE.GridHelper( 10, 10 );
gridHelper.renderOrder = -2;
( gridHelper.material as THREE.Material ).depthTest = false;
( gridHelper.material as THREE.Material ).depthWrite = false;
scene.add( gridHelper );

const axesHelper = new THREE.AxesHelper( 5 );
axesHelper.renderOrder = -1;
( axesHelper.material as THREE.Material ).depthTest = false;
( axesHelper.material as THREE.Material ).depthWrite = false;
scene.add( axesHelper );

// == update loop ==================================================================================
const clock = new THREE.Clock();

function update(): void {
  const delta = clock.getDelta();
  controls.update( delta );

  renderer.render( scene, camera );

  requestAnimationFrame( update );
}
update();

// == draggable image ==============================================================================
const imageRect = { x: 128, y: 128, w: 128, h: 128 };
let imageAspect = 1.0;

function updateImageTransform(): void {
  divDraggable.style.left = `${ imageRect.x }px`;
  divDraggable.style.top = `${ imageRect.y }px`;
  divDraggable.style.width = `${ imageRect.w }px`;
  divDraggable.style.height = `${ imageRect.h }px`;
}

divDraggable.addEventListener( 'mousedown', ( event ) => {
  event.preventDefault();
  event.stopPropagation();

  registerMouseEvent(
    ( event, { x, y } ) => {
      imageRect.x += x;
      imageRect.y += y;
      updateImageTransform();
    }
  );
} );

divImageHandleNW.addEventListener( 'mousedown', ( event ) => {
  event.preventDefault();
  event.stopPropagation();

  registerMouseEvent(
    ( event, { x, y } ) => {
      const v = ( x + y * imageAspect ) / 2;
      imageRect.x += v;
      imageRect.y += v / imageAspect;
      imageRect.w -= v;
      imageRect.h -= v / imageAspect;
      updateImageTransform();
    }
  );
} );

divImageHandleSE.addEventListener( 'mousedown', ( event ) => {
  event.preventDefault();
  event.stopPropagation();

  registerMouseEvent(
    ( event, { x, y } ) => {
      const v = ( x + y * imageAspect ) / 2;
      imageRect.w += v;
      imageRect.h += v / imageAspect;
      updateImageTransform();
    }
  );
} );

// == map and export ===============================================================================
const v4DecalRect = new THREE.Vector4();

const mapMaterial = new THREE.MeshBasicMaterial( { map: textureUVGrid } );
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

function mapAndExport(): void {
  if ( !selectedMesh ) {
    return;
  }

  renderer.getSize( _v2A );
  const prevWidth = _v2A.x;
  const prevHeight = _v2A.y;
  renderer.setSize( parseInt( inputTextureWidth.value ), parseInt( inputTextureHeight.value ) );

  v4DecalRect.set(
    imageRect.x / window.innerWidth,
    1.0 - imageRect.y / window.innerHeight,
    ( imageRect.w + imageRect.x ) / window.innerWidth,
    1.0 - ( imageRect.h + imageRect.y ) / window.innerHeight
  );

  renderer.compile( scene, camera );
  renderer.clear();
  renderer.renderBufferDirect(
    camera,
    scene,
    selectedMesh!.geometry,
    mapMaterial,
    selectedMesh!,
    selectedMesh!.geometry.groups[ 0 ] ?? null
  );

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

// == click handler ================================================================================
let haveDragged = false;

canvas.addEventListener( 'mousedown', () => {
  haveDragged = false;
} );

canvas.addEventListener( 'mousemove', () => {
  haveDragged = true;
} );

canvas.addEventListener( 'mouseup', ( event ) => {
  if ( !haveDragged ) {
    const mesh = meshPicker.pick( event.clientX, event.clientY );

    if ( mesh ) {
      selectMesh( mesh );
    }
  }
} );

// == resize handler ===============================================================================
window.addEventListener( 'resize', () => {
  if ( ( camera as any ).isOrthographicCamera ) {
    const ortho = camera as THREE.OrthographicCamera;
    const height = ortho.top - ortho.bottom;
    const xCenter = 0.5 * ( ortho.left + ortho.right );
    const hw = 0.5 * height * window.innerWidth / window.innerHeight;
    ortho.left = xCenter - hw;
    ortho.right = xCenter + hw;
  } else {
    const persp = camera as THREE.PerspectiveCamera;
    persp.aspect = window.innerWidth / window.innerHeight;
  }

  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );
} );

// == dnd handler ==================================================================================
window.addEventListener( 'dragover', ( event ) => {
  event.preventDefault();
} );

window.addEventListener( 'drop', ( event ) => {
  event.preventDefault();

  const file = event?.dataTransfer?.files?.[ 0 ];
  if ( !file ) { return; }

  if ( file.name.endsWith( '.glb' ) || file.name.endsWith( '.vrm' ) ) {
    // read given file then convert it to blob url
    const blob = new Blob( [ file ], { type: 'application/octet-stream' } );
    const url = URL.createObjectURL( blob );
    loadVRM( url );
  } else {
    // assuming it's an image
    const blob = new Blob( [ file ], { type: 'application/octet-stream' } );
    const url = URL.createObjectURL( blob );
    divDraggable.style.backgroundImage = `url( ${ url } )`;

    getImageSize( url ).then( ( { width, height } ) => {
      imageAspect = width / height;
      imageRect.w = imageRect.h * imageAspect;
      updateImageTransform();
    } );

    const prevMap = mapMaterial.map;
    mapMaterial.map = new THREE.TextureLoader().load( url, () => {
      if ( prevMap ) {
        prevMap.dispose();
      }
    } );
  }
} );

// == ui handler ===================================================================================
buttonExport.addEventListener( 'click', () => {
  mapAndExport();
} );
