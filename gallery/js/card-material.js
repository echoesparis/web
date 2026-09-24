// A port of drei's <Image> material.
//
// The demo animates three things on it — `radius` (rounded corners), `zoom`
// and `opacity` — so those have to be real uniforms rather than CSS. The
// fragment shader does aspect-preserving "cover" fitting (so a portrait photo
// on a landscape card fills it instead of stretching) plus a signed-distance
// rounded-rectangle alpha mask.

import * as THREE from 'three';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D map;
uniform vec2 scale;         // card size in world units, e.g. (1.618, 1.0)
uniform vec2 imageBounds;   // texture pixel size
uniform float radius;       // corner radius, world units
uniform float zoom;
uniform float opacity;
uniform vec3 color;
varying vec2 vUv;

vec2 aspect(vec2 size) {
    return size / min(size.x, size.y);
}

// https://iquilezles.org/articles/distfunctions2d/
float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main() {
    vec2 s = aspect(scale);
    vec2 i = aspect(imageBounds);
    float rs = s.x / s.y;
    float ri = i.x / i.y;

    // "cover": scale the image up until it fills the card, then centre it.
    vec2 fitted = rs < ri ? vec2(i.x * s.y / i.y, s.y) : vec2(s.x, i.y * s.x / i.x);
    vec2 offset = (rs < ri
        ? vec2((fitted.x - s.x) / 2.0, 0.0)
        : vec2(0.0, (fitted.y - s.y) / 2.0)) / fitted;

    vec2 uv = vUv * s / fitted + offset;
    vec2 zoomedUv = (uv - vec2(0.5)) / zoom + vec2(0.5);

    vec4 texel = texture2D(map, zoomedUv);

    // Rounded corners, evaluated in world units so they stay circular on a
    // non-square card.
    vec2 p = (vUv - 0.5) * scale;
    float d = sdRoundedBox(p, scale * 0.5, radius);
    float edge = fwidth(d);
    float mask = 1.0 - smoothstep(-edge, edge, d);

    gl_FragColor = vec4(texel.rgb * color, texel.a * opacity * mask);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`;

/**
 * @param {THREE.Texture} map
 * @param {{width:number,height:number}} bounds natural pixel size of the texture
 * @param {{width:number,height:number}} size   card size in world units
 */
export function createCardMaterial(map, bounds, size) {
    return new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        toneMapped: false,
        uniforms: {
            map: { value: map },
            scale: { value: new THREE.Vector2(size.width, size.height) },
            imageBounds: { value: new THREE.Vector2(bounds.width, bounds.height) },
            radius: { value: 0.075 },
            zoom: { value: 1 },
            opacity: { value: 1 },
            color: { value: new THREE.Color(1, 1, 1) },
        },
    });
}
