import { getImageSize } from './getImageSize';
import { registerMouseEvent } from './registerMouseEvent';

/**
 * A view logic of draggable image overlay.
 * It can be moved and scaled using mouse while maintaining its aspect ratio.
 */
export class DraggableImageOverlay {
  private readonly __divContainer: HTMLDivElement;
  private readonly __divBody: HTMLDivElement;
  private readonly __divHandleNW: HTMLDivElement;
  private readonly __divHandleSE: HTMLDivElement;

  private __rect: { x: number, y: number, w: number, h: number };
  private __aspect: number;

  public get rect(): { x: number, y: number, w: number, h: number } {
    return this.__rect;
  }

  public constructor( divContainer: HTMLDivElement ) {
    this.__divContainer = divContainer;

    this.__divBody = document.createElement( 'div' );
    this.__divBody.classList.add( 'draggableBody' );
    this.__divContainer.appendChild( this.__divBody );

    this.__divBody.addEventListener(
      'mousedown',
      ( event ) => this.__handleClickBody( event ),
    );

    this.__divHandleNW = document.createElement( 'div' );
    this.__divHandleNW.classList.add( 'draggableHandle' );
    this.__divHandleNW.classList.add( 'draggableHandleNW' );
    this.__divBody.appendChild( this.__divHandleNW );

    this.__divHandleNW.addEventListener(
      'mousedown',
      ( event ) => this.__handleClickHandleNW( event ),
    );

    this.__divHandleSE = document.createElement( 'div' );
    this.__divHandleSE.classList.add( 'draggableHandle' );
    this.__divHandleSE.classList.add( 'draggableHandleSE' );
    this.__divBody.appendChild( this.__divHandleSE );

    this.__divHandleSE.addEventListener(
      'mousedown',
      ( event ) => this.__handleClickHandleSE( event ),
    );

    this.__rect = { x: 128, y: 128, w: 128, h: 128 };
    this.__aspect = 1.0;
  }

  public loadImage( url: string ): void {
    this.__divBody.style.backgroundImage = `url( ${ url } )`;

    getImageSize( url ).then( ( { width, height } ) => {
      this.__aspect = width / height;
      this.__rect.w = this.__rect.h * this.__aspect;

      this.__updateImageTransform();
    } );
  }

  public center(): void {
    this.__rect.x = ( this.__divContainer.clientWidth - this.__rect.w ) / 2;

    this.__updateImageTransform();
  }

  private __updateImageTransform(): void {
    this.__divBody.style.left = `${ this.__rect.x }px`;
    this.__divBody.style.top = `${ this.__rect.y }px`;
    this.__divBody.style.width = `${ this.__rect.w }px`;
    this.__divBody.style.height = `${ this.__rect.h }px`;
  }

  private __handleClickBody( event: MouseEvent ): void {
    event.preventDefault();
    event.stopPropagation();

    registerMouseEvent(
      ( event, { x, y } ) => {
        this.__rect.x += x;
        this.__rect.y += y;
        this.__updateImageTransform();
      }
    );
  }

  private __handleClickHandleNW( event: MouseEvent ): void {
    event.preventDefault();
    event.stopPropagation();

    registerMouseEvent(
      ( event, { x, y } ) => {
        const v = ( x + y * this.__aspect ) / 2;
        this.__rect.x += v;
        this.__rect.y += v / this.__aspect;
        this.__rect.w -= v;
        this.__rect.h -= v / this.__aspect;
        this.__updateImageTransform();
      }
    );
  }

  private __handleClickHandleSE( event: MouseEvent ): void {
    event.preventDefault();
    event.stopPropagation();

    registerMouseEvent(
      ( event, { x, y } ) => {
        const v = ( x + y * this.__aspect ) / 2;
        this.__rect.w += v;
        this.__rect.h += v / this.__aspect;
        this.__updateImageTransform();
      }
    );
  }
}
