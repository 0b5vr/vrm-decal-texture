export async function getImageSize( url: string ): Promise<{
  width: number,
  height: number
}> {
  return new Promise( ( resolve ) => {
    const image = new Image();
    image.onload = () => {
      resolve( {
        width: image.naturalWidth,
        height: image.naturalHeight
      } );
    };
    image.src = url;
  } );
}
