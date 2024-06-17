import type { Batch, BatchableObject, Batcher } from '../../rendering/batcher/shared/Batcher';
import type { IndexBufferArray } from '../../rendering/renderers/shared/geometry/Geometry';
import type { Texture } from '../../rendering/renderers/shared/texture/Texture';
import type { BoundsData } from '../container/bounds/Bounds';
import type { Container } from '../container/Container';

/**
 * A batchable sprite object.
 * @ignore
 */
export class BatchableSprite implements BatchableObject
{
    public indexStart: number;
    public renderable: Container;

    // batch specific..
    public vertexSize = 4;
    public indexSize = 6;
    public texture: Texture;

    public textureId: number;
    public location = 0; // location in the buffer
    public batcher: Batcher = null;
    public batch: Batch = null;
    public bounds: BoundsData;
    public roundPixels: 0 | 1 = 0;

    get blendMode() { return this.renderable.groupBlendMode; }

    public packAttributes(
        float32View: Float32Array,
        uint32View: Uint32Array,
        index: number,
        textureId: number,
    )
    {
        const sprite = this.renderable;
        const texture = this.texture;

        const wt = sprite.groupTransform;

        const a = wt.a;
        const b = wt.b;
        const c = wt.c;
        const d = wt.d;
        const tx = wt.tx;
        const ty = wt.ty;

        const bounds = this.bounds;

        const w0 = bounds.maxX;
        const w1 = bounds.minX;
        const h0 = bounds.maxY;
        const h1 = bounds.minY;

        const uvs = texture.uvs;

        // _ _ _ _
        // a b g r
        const argb = sprite.groupColorAlpha;

        const textureIdAndRound = (textureId << 16) | (this.roundPixels & 0xFFFF);

        float32View[index + 0] = (a * w1) + (c * h1) + tx;
        float32View[index + 1] = (d * h1) + (b * w1) + ty;

        float32View[index + 2] = uvs.x0;
        float32View[index + 3] = uvs.y0;

        uint32View[index + 4] = argb;
        uint32View[index + 5] = textureIdAndRound;
        float32View[index + 6] = 1; // use clamp flag
        this._addClamp(texture.textureMatrix.uClampFrame, index + 7, float32View);

        // xy
        float32View[index + 11] = (a * w0) + (c * h1) + tx;
        float32View[index + 12] = (d * h1) + (b * w0) + ty;

        float32View[index + 13] = uvs.x1;
        float32View[index + 14] = uvs.y1;

        uint32View[index + 15] = argb;
        uint32View[index + 16] = textureIdAndRound;
        float32View[index + 17] = 1;
        this._addClamp(texture.textureMatrix.uClampFrame, index + 18, float32View);

        // xy
        float32View[index + 22] = (a * w0) + (c * h0) + tx;
        float32View[index + 23] = (d * h0) + (b * w0) + ty;

        float32View[index + 24] = uvs.x2;
        float32View[index + 25] = uvs.y2;

        uint32View[index + 26] = argb;
        uint32View[index + 27] = textureIdAndRound;
        float32View[index + 28] = 1;
        this._addClamp(texture.textureMatrix.uClampFrame, index + 29, float32View);

        // xy
        float32View[index + 33] = (a * w1) + (c * h0) + tx;
        float32View[index + 34] = (d * h0) + (b * w1) + ty;

        float32View[index + 35] = uvs.x3;
        float32View[index + 36] = uvs.y3;

        uint32View[index + 37] = argb;
        uint32View[index + 38] = textureIdAndRound;
        float32View[index + 39] = 1;
        this._addClamp(texture.textureMatrix.uClampFrame, index + 40, float32View);
    }

    private _addClamp(clamp: Float32Array, index: number, float32View: Float32Array)
    {
        float32View[index] = clamp[0];
        float32View[index + 1] = clamp[1];
        float32View[index + 2] = clamp[2];
        float32View[index + 3] = clamp[3];
    }

    public packIndex(indexBuffer: IndexBufferArray, index: number, indicesOffset: number)
    {
        indexBuffer[index] = indicesOffset + 0;
        indexBuffer[index + 1] = indicesOffset + 1;
        indexBuffer[index + 2] = indicesOffset + 2;

        indexBuffer[index + 3] = indicesOffset + 0;
        indexBuffer[index + 4] = indicesOffset + 2;
        indexBuffer[index + 5] = indicesOffset + 3;
    }

    public reset()
    {
        this.renderable = null;
        this.texture = null;
        this.batcher = null;
        this.batch = null;
        this.bounds = null;
    }
}
