// Data loading and arc grouping.
//
// The media list and its loaders live in ./media.js, shared with the
// slideshow. Unlike the slideshow, the ring does not shuffle: it is
// grouped chronologically, so order has to be stable.

export { loadMedia, getMediaType } from './media.js';

/** Smallest number of cards an arc is allowed to have before it is merged
 *  into the next one. Grouping by raw year alone leaves several single-item
 *  years, which read as noise rather than as sections. */
const MIN_ARC_SIZE = 4;

export function getYear(item) {
    return item.date ? item.date.slice(0, 4) : '';
}

/**
 * Group items into the ring's arcs — the analogue of the demo's four
 * hardcoded seasons.
 *
 * Items are sorted oldest-first and bucketed by year; consecutive years are
 * then merged until every bucket holds at least MIN_ARC_SIZE cards, so a
 * thin year folds into its neighbour instead of becoming a one-card arc.
 *
 * Returns [{ label, items }] in chronological order.
 */
export function groupIntoArcs(items, minSize = MIN_ARC_SIZE) {
    const sorted = [...items].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Bucket by year, preserving chronological order.
    const byYear = new Map();
    for (const item of sorted) {
        const year = getYear(item) || 'undated';
        if (!byYear.has(year)) byYear.set(year, []);
        byYear.get(year).push(item);
    }

    // Merge forward until each arc is big enough.
    const arcs = [];
    let current = null;
    for (const [year, yearItems] of byYear) {
        if (!current) current = { years: [], items: [] };
        current.years.push(year);
        current.items.push(...yearItems);
        if (current.items.length >= minSize) {
            arcs.push(current);
            current = null;
        }
    }
    // A leftover tail smaller than minSize joins the previous arc rather than
    // standing alone.
    if (current) {
        if (arcs.length) {
            const last = arcs[arcs.length - 1];
            last.years.push(...current.years);
            last.items.push(...current.items);
        } else {
            arcs.push(current);
        }
    }

    return arcs.map(arc => ({
        label: arcLabel(arc.years),
        items: arc.items,
    }));
}

function arcLabel(years) {
    const real = years.filter(y => y !== 'undated');
    if (!real.length) return 'undated';
    const first = real[0];
    const last = real[real.length - 1];
    return first === last ? first : `${first}–${last}`;
}
