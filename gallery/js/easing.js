// Frame-rate independent exponential smoothing.
//
// Stands in for maath/easing's damp/damp3, which the upstream demo uses for
// every transition. Same semantics: `lambda` is the smoothing time in seconds
// (smaller = snappier), and the step is exact for any delta.

const EPSILON = 0.001;

export function damp(object, key, target, lambda = 0.25, delta = 0.016) {
    const current = object[key];
    const diff = target - current;
    if (Math.abs(diff) < EPSILON) {
        object[key] = target;
        return false;
    }
    object[key] = target - diff * Math.exp(-delta / lambda);
    return true;
}

export function dampValue(current, target, lambda = 0.25, delta = 0.016) {
    const diff = target - current;
    if (Math.abs(diff) < EPSILON) return target;
    return target - diff * Math.exp(-delta / lambda);
}

/** Damps a THREE.Vector3 (or anything with x/y/z) toward [x, y, z]. */
export function damp3(vector, target, lambda = 0.25, delta = 0.016) {
    const [x, y, z] = Array.isArray(target) ? target : [target, target, target];
    let changed = false;
    changed = damp(vector, 'x', x, lambda, delta) || changed;
    changed = damp(vector, 'y', y, lambda, delta) || changed;
    changed = damp(vector, 'z', z, lambda, delta) || changed;
    return changed;
}
