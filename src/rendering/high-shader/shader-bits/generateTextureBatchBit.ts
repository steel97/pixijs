import { maxRecommendedTextures } from '../../renderers/shared/texture/utils/maxRecommendedTextures';

import type { HighShaderBit } from '../compiler/types';

const textureBatchBitGpuCache: Record<number, HighShaderBit> = {};

/**
 *
 * @param maxTextures - the max textures the shader can use.
 * @returns a shader bit that will allow the shader to sample multiple textures AND round pixels.
 */
function generateBindingSrc(maxTextures: number): string
{
    const src = [];

    if (maxTextures === 1)
    {
        src.push('@group(1) @binding(0) var textureSource1: texture_2d<f32>;');
        src.push('@group(1) @binding(1) var textureSampler1: sampler;');
    }
    else
    {
        let bindingIndex = 0;

        for (let i = 0; i < maxTextures; i++)
        {
            src.push(`@group(1) @binding(${bindingIndex++}) var textureSource${i + 1}: texture_2d<f32>;`);
            src.push(`@group(1) @binding(${bindingIndex++}) var textureSampler${i + 1}: sampler;`);
        }
    }

    return src.join('\n');
}

function generateSampleSrc(maxTextures: number): string
{
    const src = [];

    if (maxTextures === 1)
    {
        src.push('outColor = textureSampleGrad(textureSource1, textureSampler1, coord, uvDx, uvDy);');
    }
    else
    {
        src.push('switch vTextureId {');

        for (let i = 0; i < maxTextures; i++)
        {
            if (i === maxTextures - 1)
            {
                src.push(`  default:{`);
            }
            else
            {
                src.push(`  case ${i}:{`);
            }
            // eslint-disable-next-line max-len
            src.push(`      outColor = textureSampleGrad(textureSource${i + 1}, textureSampler${i + 1}, coord, uvDx, uvDy);`);
            src.push(`      break;}`);
        }

        src.push(`}`);
    }

    return src.join('\n');
}

export function generateTextureBatchBit(maxTextures: number): HighShaderBit
{
    if (!textureBatchBitGpuCache[maxTextures])
    {
        textureBatchBitGpuCache[maxTextures] = {
            name: 'texture-batch-bit',
            vertex: {
                header: `
                @in aTextureIdAndRound: vec2<u32>;
                @in aUseClamp: f32;
                @in aWClampFrame: vec4f;
                @out @interpolate(flat) vTextureId : u32;
                @out @interpolate(flat) vUseClamp : f32;
                @out @interpolate(flat) vClampFrame : vec4f;
            `,
                main: `
                vTextureId = aTextureIdAndRound.y;
                vUseClamp = aUseClamp;
                vClampFrame = aWClampFrame;
            `,
                end: `
                if(aTextureIdAndRound.x == 1)
                {
                    vPosition = vec4<f32>(roundPixels(vPosition.xy, globalUniforms.uResolution), vPosition.zw);
                }
            `
            },
            fragment: {
                header: `
                @in @interpolate(flat) vTextureId: u32;
                @in @interpolate(flat) vUseClamp : f32;
                @in @interpolate(flat) vClampFrame: vec4f;
    
                ${generateBindingSrc(maxRecommendedTextures())}
            `,
                main: `
                var uvDx = dpdx(vUV);
                var uvDy = dpdy(vUV);

                var coord = vUV;
                if (vUseClamp > 0.5) {
                    coord = clamp(vUV, vClampFrame.xy, vClampFrame.zw);
                }
    
                ${generateSampleSrc(maxRecommendedTextures())}
            `
            }
        };
    }

    return textureBatchBitGpuCache[maxTextures];
}

const textureBatchBitGlCache: Record<number, HighShaderBit> = {};

/**
 *
 * @param maxTextures - the max textures the shader can use.
 * @returns a shader bit that will allow the shader to sample multiple textures AND round pixels.
 */
function generateSampleGlSrc(maxTextures: number): string
{
    const src = [];

    for (let i = 0; i < maxTextures; i++)
    {
        if (i > 0)
        {
            src.push('else');
        }

        if (i < maxTextures - 1)
        {
            src.push(`if(vTextureId < ${i}.5)`);
        }

        src.push('{');
        src.push(`\toutColor = texture(uTextures[${i}], coord);`);
        src.push('}');
    }

    return src.join('\n');
}

export function generateTextureBatchBitGl(maxTextures: number): HighShaderBit
{
    if (!textureBatchBitGlCache[maxTextures])
    {
        textureBatchBitGlCache[maxTextures] = {
            name: 'texture-batch-bit',
            vertex: {
                header: `
                in vec2 aTextureIdAndRound;
                in float aUseClamp;
                in vec4 aWClampFrame;
                out float vTextureId;
                out float vUseClamp;
                out vec4 vClampFrame;
              
            `,
                main: `
                vTextureId = aTextureIdAndRound.y;
                vUseClamp = aUseClamp;
                vClampFrame = aWClampFrame;
            `,
                end: `
                if(aTextureIdAndRound.x == 1.)
                {
                    gl_Position.xy = roundPixels(gl_Position.xy, uResolution);
                }                                
            `
            },
            fragment: {
                header: `
                in float vTextureId;
                in float vUseClamp;
                in vec4 vClampFrame;
                uniform sampler2D uTextures[${maxTextures}];
              
            `,
                main: `
                vec2 coord = vUV;
                if (vUseClamp > 0.5) {
                    coord = clamp(vUV, vClampFrame.xy, vClampFrame.zw);
                }
                ${generateSampleGlSrc(maxRecommendedTextures())}
            `
            }
        };
    }

    return textureBatchBitGlCache[maxTextures];
}
