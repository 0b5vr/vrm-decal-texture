import * as THREE from 'three';
import { DraggableImageOverlay } from './DraggableImageOverlay';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { MeshPicker } from './MeshPicker';
import { VRM } from '@pixiv/three-vrm';
import { exportDecalTexture } from './exportDecalTexture';
import { textureUVGrid } from './textureUVGrid';
import CameraControls from 'camera-controls';
import threeVrmGirlVrm from './assets/models/three-vrm-girl.vrm';

// esm please
CameraControls.install( { THREE } );

// == dom ==========================================================================================
const canvas = document.getElementById( 'canvas' ) as HTMLCanvasElement;
const divContainer = document.getElementById( 'divContainer' ) as HTMLDivElement;
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
const draggableImageOverlay = new DraggableImageOverlay( divContainer );

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
let currentVrmUrl: string | null = null;
let currentImageUrl: string | null = null;

window.addEventListener( 'dragover', ( event ) => {
  event.preventDefault();
} );

window.addEventListener( 'drop', ( event ) => {
  event.preventDefault();

  const file = event?.dataTransfer?.files?.[ 0 ];
  if ( !file ) { return; }

  if ( file.name.endsWith( '.glb' ) || file.name.endsWith( '.vrm' ) ) {
    if ( currentVrmUrl != null ) {
      URL.revokeObjectURL( currentVrmUrl );
    }

    // read given file then convert it to blob url
    const blob = new Blob( [ file ], { type: 'application/octet-stream' } );
    currentVrmUrl = URL.createObjectURL( blob );

    loadVRM( currentVrmUrl );
  } else {
    if ( currentImageUrl != null ) {
      URL.revokeObjectURL( currentImageUrl );
    }

    // assuming it's an image
    const blob = new Blob( [ file ], { type: 'application/octet-stream' } );
    currentImageUrl = URL.createObjectURL( blob );

    draggableImageOverlay.loadImage( currentImageUrl );
  }
} );

// == ui handler ===================================================================================
buttonExport.addEventListener( 'click', () => {
  if ( selectedMesh == null ) {
    throw new Error( 'Please select a mesh first!' );
  }

  if ( currentImageUrl == null ) {
    throw new Error( 'Please set an image first!' );
  }

  exportDecalTexture( {
    canvas,
    renderer,
    camera,
    scene,
    mesh: selectedMesh,
    width: parseInt( inputTextureWidth.value ),
    height: parseInt( inputTextureHeight.value ),
    rect: draggableImageOverlay.rect,
    imageUrl: currentImageUrl,
  } );
} );
