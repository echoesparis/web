/**
 * vis.js network configuration options
 */
(function() {
    'use strict';
    
    window.GraphConfig = {
    "configure": {
        "enabled": false
    },
    "edges": {
        "color": {
            "inherit": true
        },
        "smooth": {
            "enabled": true,
            "type": "dynamic"
        }
    },
    "interaction": {
        "dragNodes": true,
        "hideEdgesOnDrag": false,
        "hideNodesOnDrag": false
    },
    "physics": {
        "enabled": true,
        "repulsion": {
            "centralGravity": 0.2,
            "damping": 0.09,
            "nodeDistance": 200,
            "springConstant": 0.05,
            "springLength": 200
        },
        "solver": "repulsion",
        "stabilization": {
            "enabled": true,
            "fit": true,
            "iterations": 1000,
            "onlyDynamicEdges": false,
            "updateInterval": 50
        }
    }
})();

