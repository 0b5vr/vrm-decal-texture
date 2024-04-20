import * as THREE from 'three';
import { DraggableImageOverlay } from './DraggableImageOverlay';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { MeshPicker } from './MeshPicker';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { exportDecalTexture } from './exportDecalTexture';
import { textureUVGrid } from './textureUVGrid';
import CameraControls from 'camera-controls';
import threeVrmGirlVrm from './assets/models/three-vrm-girl.vrm?url';
import { guiButtonCameraCenter, guiButtonCameraFront, guiButtonCameraReset, guiButtonExport, guiButtonImageCenter, guiInputCameraFov, guiInputCameraOrtho, guiParams } from './gui';
import { CameraManager } from './CameraManager';

// esm please
CameraControls.install( { THREE } );

// == dom ==========================================================================================
const canvas = document.getElementById( 'canvas' ) as HTMLCanvasElement;
const divContainer = document.getElementById( 'divContainer' ) as HTMLDivElement;

// == renderer =====================================================================================
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const renderer = new THREE.WebGLRenderer( {
  canvas,
  alpha: true,
  antialias: true,
} );

// == camera =======================================================================================
const cameraManager = new CameraManager( renderer );

// == scene ========================================================================================
const scene = new THREE.Scene();

// == light ========================================================================================
const light = new THREE.DirectionalLight( 0xffffff, Math.PI );
light.position.set( 1.0, 2.0, 3.0 ).normalize();
scene.add( light );

// == vrm ==========================================================================================
let currentScene: THREE.Group | null = null;
const gltfLoader = new GLTFLoader();

gltfLoader.register( ( parser ) => new VRMLoaderPlugin( parser ) );

async function loadVRM( url: string ): Promise<void> {
  if ( currentScene != null ) {
    scene.remove( currentScene );
    currentScene = null;
  }

  const gltf = await gltfLoader.loadAsync( url );
  const vrm: VRM | null = gltf.userData.vrm;

  if ( vrm == null ) {
    console.warn( 'Failed to load the model as a VRM. Fallbacking to GLTF' );
  }

  if ( vrm ) {
    VRMUtils.rotateVRM0( vrm );

    vrm.springBoneManager?.setInitState();
    vrm.nodeConstraintManager?.setInitState();
  }

  currentScene = vrm?.scene ?? gltf.scene;
  scene.add( currentScene );
}

loadVRM( threeVrmGirlVrm );

// == material picker ==============================================================================
const meshPicker = new MeshPicker( renderer );
meshPicker.scene = scene;
meshPicker.camera = cameraManager.camera;

cameraManager.cameraChangeObservers.add( () => {
  meshPicker.camera = cameraManager.camera;
} );

// == select mesh ==================================================================================
const materialSelectedOverride = new THREE.MeshBasicMaterial( { map: textureUVGrid } );

let selectedMesh: THREE.Mesh | null | undefined;
let selectedMeshOriginalMaterial: THREE.Material | THREE.Material[] | null | undefined;

function unselectMesh(): void {
  if (
    selectedMesh == null ||
    selectedMeshOriginalMaterial == null
  ) { return; }

  selectedMesh.material = selectedMeshOriginalMaterial;

  selectedMesh = null;
  selectedMeshOriginalMaterial = null;
}

function selectMesh( mesh: THREE.Mesh ): void {
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
  cameraManager.controls.update( delta );

  renderer.render( scene, cameraManager.camera );

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
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize( width, height );
  cameraManager.handleResize( width, height );
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
guiButtonCameraFront.on( 'click', () => cameraManager.front() );
guiButtonCameraCenter.on( 'click', () => cameraManager.center() );
guiButtonCameraReset.on( 'click', () => cameraManager.reset() );

guiInputCameraFov.on( 'change', ( { value } ) => {
  cameraManager.changeFov( value );
} );

guiInputCameraOrtho.on( 'change', ( { value } ) => {
  cameraManager.changeCamera( value );
} );

guiButtonImageCenter.on( 'click', () => draggableImageOverlay.center() );

guiButtonExport.on( 'click', () => {
  if ( selectedMesh == null ) {
    const message = 'Please select a mesh first!';
    alert( message );
    throw new Error( message );
  }

  if ( currentImageUrl == null ) {
    const message = 'Please set an image first!';
    alert( message );
    throw new Error( message );
  }

  exportDecalTexture( {
    canvas,
    renderer,
    camera: cameraManager.camera,
    mesh: selectedMesh,
    width: guiParams.textureWidth,
    height: guiParams.textureHeight,
    rect: draggableImageOverlay.rect,
    imageUrl: currentImageUrl,
  } );
} );
