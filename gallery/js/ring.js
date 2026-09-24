// The ring: layout, hover behaviour and per-frame damping.
//
// Structure follows the upstream demo's Scene / Cards / Card trio. Each card
// is an outer group holding its fixed place on the ring, and an inner mesh
// that damps its lift and scale — exactly how the original separates the
// static transform from the animated one.

import * as THREE from 'three';
import { createCardMaterial } from './card-material.js';
import { damp, damp3 } from './easing.js';

// --- Tunables --------------------------------------------------------------

/** Card size in world units. 1.618 x 1 is the upstream golden-ratio card. */
export const CARD_WIDTH = 1.618;
export const CARD_HEIGHT = 1;

/** Arc length one card slot occupies. Upstream packs ~22 cards per radian
 *  (pitch ~0.26), which is what makes the ring read as a card index rather
 *  than a carousel. */
const PITCH = 0.26;

/** Upstream's radius. Held as a floor so 38 cards keep the demo's card-to-ring
 *  proportions; past ~127 cards the ring grows instead of overlapping further. */
const BASE_RADIUS = 5.25;

/** Empty slots left at the end of each arc, so the sections read as separate.
 *  Upstream drops 3 of a much larger arc; 2 suits our shorter ones. */
const GAP_SLOTS = 2;

/** How far arcs step up and down, to give the ring its gentle wave. */
const ARC_Y_STEP = 0.4;

const HOVER_SCALE = 1.4;
const ACTIVE_SCALE = 1.25;   // other cards in the hovered card's arc
const HOVER_LIFT = 0.25;

// ---------------------------------------------------------------------------

class Card {
    constructor(item, texture, bounds, index, arcIndex) {
        this.item = item;
        this.index = index;
        this.arcIndex = arcIndex;

        this.group = new THREE.Group();
        this.material = createCardMaterial(texture, bounds, {
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
        });
        this.mesh = new THREE.Mesh(Card.geometry, this.material);
        this.mesh.scale.set(CARD_WIDTH, CARD_HEIGHT, 1);
        this.mesh.userData.card = this;
        this.group.add(this.mesh);
    }

    /** @param {'hovered'|'active'|'idle'} state */
    update(state, delta) {
        const factor = state === 'hovered' ? HOVER_SCALE
            : state === 'active' ? ACTIVE_SCALE
            : 1;
        damp3(this.mesh.position, [0, state === 'hovered' ? HOVER_LIFT : 0, 0], 0.1, delta);
        damp3(this.mesh.scale, [CARD_WIDTH * factor, CARD_HEIGHT * factor, 1], 0.15, delta);
        damp(this.material.uniforms.radius, 'value', state === 'hovered' ? 0.12 : 0.075, 0.2, delta);
    }

    dispose() {
        this.material.uniforms.map.value?.dispose();
        this.material.dispose();
    }
}

Card.geometry = new THREE.PlaneGeometry(1, 1);

export class Ring {
    /**
     * @param {{label: string, items: object[]}[]} arcs
     * @param {(item: object) => {texture: THREE.Texture, width: number, height: number}} getTexture
     */
    constructor(arcs, getTexture) {
        this.object = new THREE.Group();
        this.object.name = 'ring';
        this.cards = [];
        this.arcs = [];
        this.hovered = null;

        const slotsPerArc = arcs.map(arc => arc.items.length + GAP_SLOTS);
        const totalSlots = slotsPerArc.reduce((a, b) => a + b, 0);
        this.radius = Math.max(BASE_RADIUS, (totalSlots * PITCH) / (Math.PI * 2));

        let from = 0;
        let index = 0;

        arcs.forEach((arc, arcIndex) => {
            const slots = slotsPerArc[arcIndex];
            const len = (slots / totalSlots) * Math.PI * 2;
            // A gentle vertical wave across the ring, like the demo's
            // summer +0.4 / winter -0.4 offsets.
            const y = arcs.length > 1
                ? Math.sin((arcIndex / arcs.length) * Math.PI * 2) * ARC_Y_STEP
                : 0;

            const arcGroup = new THREE.Group();
            arcGroup.position.y = y;
            this.object.add(arcGroup);

            arc.items.forEach((item, i) => {
                const angle = from + (i / slots) * len;
                const { texture, width, height } = getTexture(item);
                const card = new Card(item, texture, { width, height }, index, arcIndex);
                card.group.position.set(
                    Math.sin(angle) * this.radius,
                    0,
                    Math.cos(angle) * this.radius,
                );
                card.group.rotation.y = Math.PI / 2 + angle;
                card.angle = angle;
                arcGroup.add(card.group);
                this.cards.push(card);
                index += 1;
            });

            this.arcs.push({
                label: arc.label,
                from,
                len,
                y,
                // Mid-arc point, where the label floats.
                labelPosition: new THREE.Vector3(
                    Math.sin(from + len / 2) * this.radius * 1.4,
                    y + 0.5,
                    Math.cos(from + len / 2) * this.radius * 1.4,
                ),
            });

            from += len;
        });
    }

    get meshes() {
        return this.cards.map(card => card.mesh);
    }

    setHovered(card) {
        this.hovered = card;
    }

    update(delta) {
        const hovered = this.hovered;
        for (const card of this.cards) {
            const state = card === hovered ? 'hovered'
                : hovered && card.arcIndex === hovered.arcIndex ? 'active'
                : 'idle';
            card.update(state, delta);
        }
    }

    /** World angle, in turns, that brings a card to face the camera. */
    offsetForCard(card) {
        return card.angle / (Math.PI * 2);
    }

    /** Opening rotation. Arc 0 begins at angle 0, which is dead ahead, so the
     *  untouched ring would face the empty slots at the end of the last arc.
     *  Start on the middle of the biggest section instead. */
    defaultOffset() {
        let biggest = this.arcs[0];
        for (const arc of this.arcs) if (arc.len > biggest.len) biggest = arc;
        return (biggest.from + biggest.len / 2) / (Math.PI * 2);
    }

    findByFilename(filename) {
        const needle = filename.toLowerCase();
        return this.cards.find(card => {
            const name = card.item.src.split('/').pop().toLowerCase();
            return name === needle
                || (card.item.caption || '').toLowerCase() === needle;
        }) || null;
    }

    dispose() {
        this.cards.forEach(card => card.dispose());
        Card.geometry.dispose();
    }
}
