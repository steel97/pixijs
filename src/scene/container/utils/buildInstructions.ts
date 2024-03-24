import type { InstructionSet } from '../../../rendering/renderers/shared/instructions/InstructionSet';
import type { InstructionPipe, RenderPipe } from '../../../rendering/renderers/shared/instructions/RenderPipe';
import type { Renderable } from '../../../rendering/renderers/shared/Renderable';
import type { RenderPipes } from '../../../rendering/renderers/types';
import type { Container } from '../Container';
import type { RenderGroup } from '../RenderGroup';

export function buildInstructions(renderGroup: RenderGroup, renderPipes: RenderPipes)
{
    const root = renderGroup.root;
    const instructionSet = renderGroup.instructionSet;

    instructionSet.reset();

    // TODO add some events / runners for build start
    renderPipes.batch.buildStart(instructionSet);
    renderPipes.blendMode.buildStart();
    renderPipes.colorMask.buildStart();

    if (root.sortableChildren)
    {
        root.sortChildren();
    }

    collectAllRenderablesAdvanced(root, instructionSet, renderPipes, true);

    // instructionSet.log();
    // TODO add some events / runners for build end
    renderPipes.batch.buildEnd(instructionSet);
    renderPipes.blendMode.buildEnd(instructionSet);

    // instructionSet.log();
}

export function getZOrderRecursive(child: Container)
{
    if (child._zOrder !== null && child._zOrder !== undefined && child._zOrder !== 0) return child._zOrder;
    if (child.parent === null) return 0;
    if (child.parent._zOrder !== null && child.parent._zOrder !== undefined) return child.parent._zOrder;

    return getZOrderRecursive(child.parent);
}

export function collectChildRelative(arr: Array<Container>, container: Container)
{
    container.children.forEach((child) =>
    {
        if (child.globalDisplayStatus < 0b111 || !child.includeInBuild) return;
        arr.push(child);
        child._zOrderLocal = getZOrderRecursive(child);
        collectChildRelative(arr, child);
    });
}

export function collectAllRenderables(
    container: Container,
    instructionSet: InstructionSet,
    rendererPipes: RenderPipes
): void
{
    // if there is 0b01 or 0b10 the return value

    if (container.globalDisplayStatus < 0b111 || !container.includeInBuild) return;

    if (container.sortableChildren)
    {
        container.sortChildren();
    }

    const allRenderables: Array<Container> = [container];

    collectChildRelative(allRenderables, container);
    allRenderables.sort((a: Container, b: Container) => a._zOrderLocal - b._zOrderLocal);

    for (const child of allRenderables)
    {
        if (child.isSimple)
        {
            collectAllRenderablesSimpleSingle(child, instructionSet, rendererPipes);
        }
        else
        {
            collectAllRenderablesAdvancedSingle(child, instructionSet, rendererPipes, false);
        }
    }
}

function collectAllRenderablesSimpleSingle(
    container: Container,
    instructionSet: InstructionSet,
    renderPipes: RenderPipes
): void
{
    if (container.renderPipeId)
    {
        // TODO add blends in
        renderPipes.blendMode.setBlendMode(container as Renderable, container.groupBlendMode, instructionSet);

        container.didViewUpdate = false;

        const rp = renderPipes as unknown as Record<string, RenderPipe>;

        rp[container.renderPipeId].addRenderable(container as Renderable, instructionSet);
    }
}

function collectAllRenderablesAdvanced(
    container: Container,
    instructionSet: InstructionSet,
    renderPipes: RenderPipes,
    isRoot: boolean
): void
{
    if (!isRoot && container.isRenderGroupRoot)
    {
        renderPipes.renderGroup.addRenderGroup(container.renderGroup, instructionSet);
    }
    else
    {
        for (let i = 0; i < container.effects.length; i++)
        {
            const effect = container.effects[i];
            const pipe = renderPipes[effect.pipe as keyof RenderPipes]as InstructionPipe<any>;

            pipe.push(effect, container, instructionSet);
        }

        const renderPipeId = container.renderPipeId;

        if (renderPipeId)
        {
            // TODO add blends in
            renderPipes.blendMode.setBlendMode(container as Renderable, container.groupBlendMode, instructionSet);
            container.didViewUpdate = false;

            const pipe = renderPipes[renderPipeId as keyof RenderPipes]as RenderPipe<any>;

            pipe.addRenderable(container, instructionSet);
        }

        const children = container.children;

        if (children.length)
        {
            for (let i = 0; i < children.length; i++)
            {
                collectAllRenderables(children[i], instructionSet, renderPipes);
            }
        }

        // loop backwards through effects
        for (let i = container.effects.length - 1; i >= 0; i--)
        {
            const effect = container.effects[i];
            const pipe = renderPipes[effect.pipe as keyof RenderPipes]as InstructionPipe<any>;

            pipe.pop(effect, container, instructionSet);
        }
    }
}

function collectAllRenderablesAdvancedSingle(
    container: Container,
    instructionSet: InstructionSet,
    renderPipes: RenderPipes,
    isRoot: boolean
): void
{
    if (!isRoot && container.isRenderGroupRoot)
    {
        renderPipes.renderGroup.addRenderGroup(container.renderGroup, instructionSet);
    }
    else
    {
        for (let i = 0; i < container.effects.length; i++)
        {
            const effect = container.effects[i];
            const pipe = renderPipes[effect.pipe as keyof RenderPipes]as InstructionPipe<any>;

            pipe.push(effect, container, instructionSet);
        }

        const renderPipeId = container.renderPipeId;

        if (renderPipeId)
        {
            // TODO add blends in
            renderPipes.blendMode.setBlendMode(container as Renderable, container.groupBlendMode, instructionSet);
            container.didViewUpdate = false;

            const pipe = renderPipes[renderPipeId as keyof RenderPipes]as RenderPipe<any>;

            pipe.addRenderable(container, instructionSet);
        }

        // loop backwards through effects
        for (let i = container.effects.length - 1; i >= 0; i--)
        {
            const effect = container.effects[i];
            const pipe = renderPipes[effect.pipe as keyof RenderPipes]as InstructionPipe<any>;

            pipe.pop(effect, container, instructionSet);
        }
    }
}

