import { Observer, notifyObservers } from '@0b5vr/experimental';
import CameraControls from 'camera-controls';
import * as THREE from 'three';

const _v3A = /*@__PURE__*/ new THREE.Vector3();
const _v3B = /*@__PURE__*/ new THREE.Vector3();

export class CameraManager {
  public readonly renderer: THREE.WebGLRenderer;

  public camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  public controls: CameraControls;
  public cameraChangeObservers: Set<Observer>;

  public constructor( renderer: THREE.WebGLRenderer ) {
    this.renderer = renderer;

    this.camera = this._createCameraPersp();
    this.controls = this._createControls();

    this.cameraChangeObservers = new Set();
  }

  public changeCamera( ortho: boolean ): void {
    if ( ortho ) {
      this.camera = this._createCameraOrtho();
    } else {
      this.camera = this._createCameraPersp();
    }

    this.controls = this._createControls( this.controls );

    notifyObservers( this.cameraChangeObservers );
  }

  public changeFov( fov: number ): void {
    if ( this.camera instanceof THREE.PerspectiveCamera ) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  public handleResize( width: number, height: number ): void {
    const { camera } = this;

    if ( camera instanceof THREE.OrthographicCamera ) {
      const height = camera.top - camera.bottom;
      const xCenter = 0.5 * ( camera.left + camera.right );
      const hw = 0.5 * height * width / height;
      camera.left = xCenter - hw;
      camera.right = xCenter + hw;
    } else {
      camera.aspect = width / height;
    }

    camera.updateProjectionMatrix();
  }

  public front(): void {
    this.controls.rotateTo( 0.0, Math.PI / 2.0 );
  }

  public center(): void {
    this.controls.getPosition( _v3A );
    this.controls.moveTo( 0.0, _v3A.y, 0.0 );
  }

  public reset(): void {
    this.controls.setPosition( 0.0, 1.0, 5.0 );
    this.controls.setTarget( 0.0, 1.0, 0.0 );
  }

  private _createCameraOrtho(): THREE.OrthographicCamera {
    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;

    return new THREE.OrthographicCamera(
      -2.5 / height * width,
      2.5 / height * width,
      2.5,
      -2.5,
      0.1,
      100.0,
    );
  }

  private _createCameraPersp(): THREE.PerspectiveCamera {
    return new THREE.PerspectiveCamera(
      30.0,
      window.innerWidth / window.innerHeight,
      0.1,
      100.0,
    );
  }

  private _createControls( prevControls?: CameraControls ): CameraControls {
    _v3A.set( 0.0, 1.0, 5.0 );
    prevControls?.getPosition( _v3A );

    _v3B.set( 0.0, 1.0, 0.0 );
    prevControls?.getTarget( _v3B );

    const controls = new CameraControls( this.camera, this.renderer.domElement );
    controls.setPosition( _v3A.x, _v3A.y, _v3A.z);
    controls.setTarget( _v3B.x, _v3B.y, _v3B.z );

    prevControls?.dispose();

    return controls;
  }
}
