import { RGRenderable } from '../../../rendering/renderers/shared/RGRenderable';

import type { InstructionSet } from '../../../rendering/renderers/shared/instructions/InstructionSet';
import type { InstructionPipe, RenderPipe } from '../../../rendering/renderers/shared/instructions/RenderPipe';
import type { Renderable } from '../../../rendering/renderers/shared/Renderable';
import type { RenderPipes } from '../../../rendering/renderers/types';
import type { Container } from '../Container';
import type { RenderGroup } from '../RenderGroup';

export function buildInstructions(renderGroup: RenderGroup, renderPipes: RenderPipes) {
    const root = renderGroup.root;
    const instructionSet = renderGroup.instructionSet;

    instructionSet.reset();

    // TODO add some events / runners for build start
    renderPipes.batch.buildStart(instructionSet);
    renderPipes.blendMode.buildStart();
    renderPipes.colorMask.buildStart();

    if (root.sortableChildren) {
        root.sortChildren();
    }

    collectAllRenderablesAdvanced(root, instructionSet, renderPipes, true);

    // instructionSet.log();
    // TODO add some events / runners for build end
    renderPipes.batch.buildEnd(instructionSet);
    renderPipes.blendMode.buildEnd(instructionSet);

    // instructionSet.log();
}

export function getZOrderRecursive(child: Container) {
    if (child._zOrder != null) return child._zOrder;
    if (child.parent == null) return 0;
    if (child.parent._zOrder != null) return child.parent._zOrder;
    return getZOrderRecursive(child.parent);
}

export function collectChildRelative(arr: Array<Container>, container: Container) {
    container.children.forEach(child => {
        if (child.rgVisibleRenderable < 0b11 || !child.includeInBuild) return;
        arr.push(child);
        child._zOrderLocal = getZOrderRecursive(child);
        collectChildRelative(arr, child);
    });
}

export function collectAllRenderables(
    container: Container,
    instructionSet: InstructionSet,
    rendererPipes: RenderPipes
): void {
    // if there is 0b01 or 0b10 the return value

    if (container.rgVisibleRenderable < 0b11 || !container.includeInBuild) return;

    if (container.sortableChildren) {
        container.sortChildren();
    }

    const allRenderables: Array<Container> = [container];
    collectChildRelative(allRenderables, container);
    allRenderables.sort((a: Container, b: Container) => a._zOrderLocal - b._zOrderLocal);

    for (const child of allRenderables) {
        if (child.isSimple) {
            collectAllRenderablesSimpleSingle(child, instructionSet, rendererPipes);
        }
        else {
            collectAllRenderablesAdvancedSingle(child, instructionSet, rendererPipes, false);
        }
    }
}

function collectAllRenderablesSimple(
    container: Container,
    instructionSet: InstructionSet,
    renderPipes: RenderPipes
): void {
    const view = container.view;

    if (view) {
        // TODO add blends in
        renderPipes.blendMode.setBlendMode(container as Renderable, container.rgBlendMode, instructionSet);

        container.didViewUpdate = false;

        const rp = renderPipes as unknown as Record<string, RenderPipe>;

        rp[view.renderPipeId].addRenderable(container, instructionSet);
    }

    if (!container.isRenderGroupRoot) {
        const children = container.children;
        const length = children.length;

        for (let i = 0; i < length; i++) {
            collectAllRenderables(children[i], instructionSet, renderPipes);
        }
    }
}

function collectAllRenderablesAdvanced(
    container: Container,
    instructionSet: InstructionSet,
    renderPipes: RenderPipes,
    isRoot: boolean
): void {
    if (isRoot) {
        const renderGroup = container.renderGroup;

        if (renderGroup.root.view) {
            // proxy renderable is needed here as we do not want to inherit the transform / color of the root container
            const proxyRenderable = renderGroup.proxyRenderable ?? initProxyRenderable(renderGroup);

            if (proxyRenderable) {
                renderPipes.blendMode.setBlendMode(proxyRenderable, proxyRenderable.rgBlendMode, instructionSet);

                // eslint-disable-next-line max-len
                (renderPipes[proxyRenderable.view.renderPipeId as keyof RenderPipes] as any).addRenderable(proxyRenderable, instructionSet);
            }
        }
    }
    else {
        for (let i = 0; i < container.effects.length; i++) {
            const effect = container.effects[i];
            const pipe = renderPipes[effect.pipe as keyof RenderPipes] as InstructionPipe<any>;

            pipe.push(effect, container, instructionSet);
        }
    }

    if (!isRoot && container.isRenderGroupRoot) {
        renderPipes.renderGroup.addRenderGroup(container.renderGroup, instructionSet);
    }
    else {
        const view = container.view;

        if (view) {
            // TODO add blends in
            renderPipes.blendMode.setBlendMode(container as Renderable, container.rgBlendMode, instructionSet);
            container.didViewUpdate = false;

            const pipe = renderPipes[view.renderPipeId as keyof RenderPipes] as RenderPipe<any>;

            pipe.addRenderable(container, instructionSet);
        }

        const children = container.children;

        if (children.length) {
            for (let i = 0; i < children.length; i++) {
                collectAllRenderables(children[i], instructionSet, renderPipes);
            }
        }
    }

    if (!isRoot) {
        // loop backwards through effects
        for (let i = container.effects.length - 1; i >= 0; i--) {
            const effect = container.effects[i];
            const pipe = renderPipes[effect.pipe as keyof RenderPipes] as InstructionPipe<any>;

            pipe.pop(effect, container, instructionSet);
        }
    }
}

function collectAllRenderablesSimpleSingle(
    container: Container,
    instructionSet: InstructionSet,
    renderPipes: RenderPipes
): void {
    const view = container.view;

    if (view) {
        // TODO add blends in
        renderPipes.blendMode.setBlendMode(container as Renderable, container.rgBlendMode, instructionSet);

        container.didViewUpdate = false;

        const rp = renderPipes as unknown as Record<string, RenderPipe>;

        rp[view.renderPipeId].addRenderable(container, instructionSet);
    }
}

function collectAllRenderablesAdvancedSingle(
    container: Container,
    instructionSet: InstructionSet,
    renderPipes: RenderPipes,
    isRoot: boolean
): void {
    if (isRoot) {
        const renderGroup = container.renderGroup;

        if (renderGroup.root.view) {
            // proxy renderable is needed here as we do not want to inherit the transform / color of the root container
            const proxyRenderable = renderGroup.proxyRenderable ?? initProxyRenderable(renderGroup);

            if (proxyRenderable) {
                renderPipes.blendMode.setBlendMode(proxyRenderable, proxyRenderable.rgBlendMode, instructionSet);

                // eslint-disable-next-line max-len
                (renderPipes[proxyRenderable.view.renderPipeId as keyof RenderPipes] as any).addRenderable(proxyRenderable, instructionSet);
            }
        }
    }
    else {
        for (let i = 0; i < container.effects.length; i++) {
            const effect = container.effects[i];
            const pipe = renderPipes[effect.pipe as keyof RenderPipes] as InstructionPipe<any>;

            pipe.push(effect, container, instructionSet);
        }
    }

    if (!isRoot && container.isRenderGroupRoot) {
        renderPipes.renderGroup.addRenderGroup(container.renderGroup, instructionSet);
    }
    else {
        const view = container.view;

        if (view) {
            // TODO add blends in
            renderPipes.blendMode.setBlendMode(container as Renderable, container.rgBlendMode, instructionSet);
            container.didViewUpdate = false;

            const pipe = renderPipes[view.renderPipeId as keyof RenderPipes] as RenderPipe<any>;

            pipe.addRenderable(container, instructionSet);
        }
    }

    if (!isRoot) {
        // loop backwards through effects
        for (let i = container.effects.length - 1; i >= 0; i--) {
            const effect = container.effects[i];
            const pipe = renderPipes[effect.pipe as keyof RenderPipes] as InstructionPipe<any>;

            pipe.pop(effect, container, instructionSet);
        }
    }
}

function initProxyRenderable(renderGroup: RenderGroup) {
    const root = renderGroup.root;

    renderGroup.proxyRenderable = new RGRenderable({
        original: root,
        view: root.view,
    });
}
