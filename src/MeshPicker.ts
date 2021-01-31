import * as THREE from 'three';

const _v2A = new THREE.Vector2;

export class MeshPicker {
  public readonly renderer: THREE.WebGLRenderer;
  public scene?: THREE.Scene | null;
  public camera?: THREE.Camera | null;

  private _readPixelsBuffer: Uint8Array;
  private _renderTarget: THREE.WebGLRenderTarget | undefined;
  private _renderTargetSize: THREE.Vector2;

  public constructor( renderer: THREE.WebGLRenderer ) {
    this.renderer = renderer;

    this._readPixelsBuffer = new Uint8Array( 4 );
    this._renderTargetSize = new THREE.Vector2( 0, 0 );
    this._prepareRenderTarget();
  }

  public pick( x: number, y: number ): THREE.Mesh | null {
    const { renderer, scene, camera } = this;
    if ( scene == null || camera == null ) {
      throw new Error( 'You must set scene and camera before pick a material' );
    }

    // prepare render target
    const prevRenderTarget = renderer.getRenderTarget();
    const renderTarget = this._prepareRenderTarget();
    renderer.setRenderTarget( renderTarget );

    // replace materials
    const meshMaterialMap = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    const idMeshMap = new Map<number, THREE.Mesh>();
    let id = 1;

    scene.traverseVisible( ( object ) => {
      if ( ( object as any ).isMesh ) {
        const mesh = object as THREE.Mesh;
        const materialOrArray = mesh.material;
        meshMaterialMap.set( mesh, materialOrArray );

        if ( Array.isArray( materialOrArray ) ) {
          mesh.material = materialOrArray.map( ( material ) => {
            return this._createTempMaterial( material, id );
          } );
        } else {
          const material = materialOrArray;
          mesh.material = this._createTempMaterial( material, id );
        }

        idMeshMap.set( id, mesh );
        id ++;
      }
    } );

    // render
    renderer.render( scene, camera );

    // revert to previous material
    scene.traverse( ( object ) => {
      if ( ( object as any ).isMesh ) {
        const mesh = object as THREE.Mesh;
        const materialOrArray = meshMaterialMap.get( mesh );
        if ( materialOrArray ) {
          mesh.material = materialOrArray;
        }
      }
    } );

    // revert to previous state
    renderer.setRenderTarget( prevRenderTarget );

    // pick a color
    renderer.readRenderTargetPixels(
      renderTarget,
      x,
      this._renderTargetSize.y - 1 - y,
      1,
      1,
      this._readPixelsBuffer
    );

    const pickedId = (
      ( this._readPixelsBuffer[ 0 ] << 16 ) +
      ( this._readPixelsBuffer[ 1 ] << 8 ) +
      this._readPixelsBuffer[ 2 ]
    );
    return idMeshMap.get( pickedId ) ?? null;
  }

  private _prepareRenderTarget(): THREE.WebGLRenderTarget {
    this.renderer.getSize( _v2A );

    if ( this._renderTarget == null ) {
      this._renderTarget = new THREE.WebGLRenderTarget( _v2A.x, _v2A.y );
      this._renderTargetSize.copy( _v2A );
    } else if ( !_v2A.equals( this._renderTargetSize ) ) {
      this._renderTarget.dispose();

      this._renderTarget = new THREE.WebGLRenderTarget( _v2A.x, _v2A.y );
      this._renderTargetSize.copy( _v2A );
    }

    return this._renderTarget;
  }

  private _createTempMaterial( original: THREE.Material, id: number ): THREE.Material {
    // we don't want to pick outlines!
    if ( ( /Outline/i ).exec( original.name ) ) {
      return new THREE.MeshBasicMaterial( { visible: false } );
    }

    if ( !original.visible ) {
      return new THREE.MeshBasicMaterial( { visible: false } );
    }

    let alphaTest = ( original as any ).alphaTest;
    if ( ( original as any ).isMToonMaterial ) {
      alphaTest = ( original as any ).cutoff;
    }

    const material = new THREE.MeshBasicMaterial( {
      map: ( original as any ).map,
      alphaTest,
      color: id,
    } );
    material.onBeforeCompile = ( shader ) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
#ifdef USE_MAP
  vec4 texelColor = texture2D( map, vUv );
  texelColor = mapTexelToLinear( texelColor );
  diffuseColor.a *= texelColor.a;
#endif
        `
      );
    };

    return material;
  }
}
