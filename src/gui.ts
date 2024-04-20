import { Pane } from 'tweakpane';

const pane = new Pane();

export const guiParams = {
  cameraFov: 30.0,
  cameraOrtho: false,
  textureWidth: 1024,
  textureHeight: 1024,
};

const folderCamera = pane.addFolder( { title: 'Camera' } );

export const guiInputCameraFov = folderCamera.addBinding( guiParams, 'cameraFov', {
  label: 'FOV',
  min: 10.0,
  max: 90.0,
} );

export const guiInputCameraOrtho = folderCamera.addBinding( guiParams, 'cameraOrtho', {
  label: 'Ortho',
} );

export const guiButtonCameraFront = folderCamera.addButton( { title: 'Front' } );
export const guiButtonCameraCenter = folderCamera.addButton( { title: 'Center' } );
export const guiButtonCameraReset = folderCamera.addButton( { title: 'Reset' } );

const folderTexture = pane.addFolder( { title: 'Texture' } );

folderTexture.addBinding( guiParams, 'textureWidth', { label: 'width', step: 1 } );
folderTexture.addBinding( guiParams, 'textureHeight', { label: 'height', step: 1 } );

const folderImage = pane.addFolder( { title: 'Image' } );

export const guiButtonImageCenter = folderImage.addButton( { title: 'Center' } );

export const guiButtonExport = pane.addButton( { title: 'Export' } );
