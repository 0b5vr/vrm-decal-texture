/**
 * Register a pair of one-off `mousemove` / `mouseup` events.
 *
 * @example
 * ```ts
 * div.addEventListener( 'mousedown', ( event ) => {
 *   event.preventDefault();
 *   event.stopPropagation();
 *
 *   registerMouseEvent(
 *     ( event, { x, y } ) => {
 *       console.log( 'move', x, y );
 *     },
 *     ( event, { x, y } ) => {
 *       console.log( 'up', x, y );
 *     },
 *   );
 * } );
 * ```
 *
 * @param move A callback executed when the mouse is moved
 * @param up A callback executed when the mouse is released
 */
export function registerMouseEvent(
  move: ( event: MouseEvent, movementSum: { x: number; y: number } ) => void,
  up?: ( event: MouseEvent ) => void
): void {
  let isDone = false;
  let moveEvent: MouseEvent | undefined;
  let movementSum = { x: 0.0, y: 0.0 };

  const update = (): void => {
    if ( isDone ) { return; }
    requestAnimationFrame( update );

    if ( moveEvent ) {
      move( moveEvent, movementSum );
      moveEvent = undefined;
      movementSum = { x: 0.0, y: 0.0 };
    }
  };
  update();

  const movet = ( event: MouseEvent ): void => {
    moveEvent = event;
    movementSum.x += event.movementX;
    movementSum.y += event.movementY;
  };

  const upt = ( event: MouseEvent ): void => {
    if ( !isDone ) {
      up && up( event );
      isDone = true;
    }
    window.removeEventListener( 'mousemove', movet );
    window.removeEventListener( 'mouseup', upt );
    window.removeEventListener( 'mousedown', upt );
  };

  window.addEventListener( 'mousemove', movet );
  window.addEventListener( 'mouseup', upt );
  setTimeout( () => window.addEventListener( 'mousedown', upt ) );
}
