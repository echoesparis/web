/**
 * Core graph initialization and management
 * Handles data loading, network creation, and module coordination
 */
(function() {
    'use strict';

    let nodes = null;
    let edges = null;
    let allNodes = null;
    let allEdges = null;
    let nodeColors = {};
    let network = null;
    let container = null;

    /**
     * Initialize the graph with data from a JSON file, or an already-loaded data object
     * @param {string} containerId - ID of the container element
     * @param {string|Object} dataSource - Path to a JSON data file (fetched via HTTP), or a
     *   preloaded {nodes, edges} object — pass an object when opening the page as a local
     *   file:// document, since browsers block fetch() of local files.
     * @returns {Promise} Promise that resolves when graph is initialized
     */
    async function init(containerId, dataSource) {
        container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container element with ID "${containerId}" not found`);
        }

        try {
            let data;
            if (typeof dataSource === 'string') {
                const response = await fetch(dataSource);
                if (!response.ok) {
                    throw new Error(`Failed to load data from ${dataSource}: ${response.statusText}`);
                }
                data = await response.json();
            } else {
                data = dataSource;
            }

            // Initialize vis.js DataSets
            nodes = new vis.DataSet(data.nodes);
            edges = new vis.DataSet(data.edges);

            // Store original node colors
            allNodes = nodes.get({ returnType: "Object" });
            for (let nodeId in allNodes) {
                nodeColors[nodeId] = allNodes[nodeId].color;
            }
            allEdges = edges.get({ returnType: "Object" });

            // Create data object for network
            const networkData = { nodes: nodes, edges: edges };

            // Get configuration
            const options = window.GraphConfig || {};

            // Create network
            network = new vis.Network(container, networkData, options);

            // Initialize modules
            if (window.GraphHighlighting) {
                window.GraphHighlighting.init(nodes, network, nodeColors);
            }

            if (window.GraphFiltering) {
                window.GraphFiltering.init(nodes, edges, network);
            }

            if (window.GraphPopup) {
                window.GraphPopup.init(container, nodes, network);
            }

            // Set up selection event handlers
            network.on("selectNode", function (params) {
                if (params.nodes.length > 0) {
                    if (window.GraphHighlighting) {
                        window.GraphHighlighting.neighbourhoodHighlight(params);
                    }
                }
            });

            network.on("deselectNode", function (params) {
                if (window.GraphHighlighting) {
                    window.GraphHighlighting.neighbourhoodHighlight({ nodes: [] });
                }
            });

            return network;
        } catch (error) {
            console.error('Error initializing graph:', error);
            throw error;
        }
    }

    /**
     * Get the network instance
     * @returns {vis.Network} The network instance
     */
    function getNetwork() {
        return network;
    }

    /**
     * Get the nodes DataSet
     * @returns {vis.DataSet} The nodes DataSet
     */
    function getNodes() {
        return nodes;
    }

    /**
     * Get the edges DataSet
     * @returns {vis.DataSet} The edges DataSet
     */
    function getEdges() {
        return edges;
    }

    // Export to global scope
    window.GraphCore = {
        init: init,
        getNetwork: getNetwork,
        getNodes: getNodes,
        getEdges: getEdges
    };
})();

