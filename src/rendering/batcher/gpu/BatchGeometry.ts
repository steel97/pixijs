import { Buffer } from '../../renderers/shared/buffer/Buffer';
import { BufferUsage } from '../../renderers/shared/buffer/const';
import { Geometry } from '../../renderers/shared/geometry/Geometry';

const placeHolderBufferData = new Float32Array(1);
const placeHolderIndexData = new Uint32Array(1);

export class BatchGeometry extends Geometry
{
    constructor()
    {
        const vertexSize = 11;

        const attributeBuffer = new Buffer({
            data: placeHolderBufferData,
            label: 'attribute-batch-buffer',
            usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
            shrinkToFit: false,
        });

        const indexBuffer = new Buffer({
            data: placeHolderIndexData,
            label: 'index-batch-buffer',
            usage: BufferUsage.INDEX | BufferUsage.COPY_DST, // | BufferUsage.STATIC,
            shrinkToFit: false,
        });

        const stride = vertexSize * 4;

        super({
            attributes: {
                aPosition: {
                    buffer: attributeBuffer,
                    format: 'float32x2',
                    stride,
                    offset: 0,
                    location: 1,
                },
                aUV: {
                    buffer: attributeBuffer,
                    format: 'float32x2',
                    stride,
                    offset: 2 * 4,
                    location: 3,
                },
                aColor: {
                    buffer: attributeBuffer,
                    format: 'unorm8x4',
                    stride,
                    offset: 4 * 4,
                    location: 0,
                },
                aTextureIdAndRound: {
                    buffer: attributeBuffer,
                    format: 'uint16x2',
                    stride,
                    offset: 5 * 4,
                    location: 2,
                },
                aUseClamp: {
                    buffer: attributeBuffer,
                    format: 'float32',
                    stride,
                    offset: 6 * 4,
                    location: 4,
                },
                aWClampFrame: {
                    buffer: attributeBuffer,
                    format: 'float32x4',
                    stride,
                    offset: 7 * 4,
                    location: 5,
                },
            },
            indexBuffer
        });
    }
}

