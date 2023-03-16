/**
 * Give me an image URL and I'll tell you the resolution of the image.
 *
 * @param url The image url
 * @returns An object contains `width` and `height`
 */
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
