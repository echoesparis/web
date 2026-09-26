/**
 * Filtering functionality for the graph
 * Handles node/edge filtering and selection
 */
(function() {
    'use strict';

    let filterActive = false;
    let filter = {
        item: '',
        property: '',
        value: []
    };
    let nodes = null;
    let edges = null;
    let network = null;

    /**
     * Initialize the filtering module with required dependencies
     * @param {vis.DataSet} nodesDataSet - The nodes DataSet
     * @param {vis.DataSet} edgesDataSet - The edges DataSet
     * @param {vis.Network} networkInstance - The network instance
     */
    function init(nodesDataSet, edgesDataSet, networkInstance) {
        nodes = nodesDataSet;
        edges = edgesDataSet;
        network = networkInstance;
    }

    /**
     * Filter highlight based on selected nodes
     * @param {Object} params - Event parameters with nodes array
     */
    function filterHighlight(params) {
        let allNodes = nodes.get({ returnType: "Object" });
        
        // if something is selected:
        if (params.nodes.length > 0) {
            filterActive = true;
            let selectedNodes = params.nodes;

            // hiding all nodes and saving the label
            for (let nodeId in allNodes) {
                allNodes[nodeId].hidden = true;
                if (allNodes[nodeId].savedLabel === undefined) {
                    allNodes[nodeId].savedLabel = allNodes[nodeId].label;
                    allNodes[nodeId].label = undefined;
                }
            }

            for (let i = 0; i < selectedNodes.length; i++) {
                allNodes[selectedNodes[i]].hidden = false;
                if (allNodes[selectedNodes[i]].savedLabel !== undefined) {
                    allNodes[selectedNodes[i]].label = allNodes[selectedNodes[i]].savedLabel;
                    allNodes[selectedNodes[i]].savedLabel = undefined;
                }
            }

        } else if (filterActive === true) {
            // reset all nodes
            for (let nodeId in allNodes) {
                allNodes[nodeId].hidden = false;
                if (allNodes[nodeId].savedLabel !== undefined) {
                    allNodes[nodeId].label = allNodes[nodeId].savedLabel;
                    allNodes[nodeId].savedLabel = undefined;
                }
            }
            filterActive = false;
        }

        // transform the object into an array
        var updateArray = [];
        if (params.nodes.length > 0) {
            for (let nodeId in allNodes) {
                if (allNodes.hasOwnProperty(nodeId)) {
                    updateArray.push(allNodes[nodeId]);
                }
            }
            nodes.update(updateArray);
        } else {
            for (let nodeId in allNodes) {
                if (allNodes.hasOwnProperty(nodeId)) {
                    updateArray.push(allNodes[nodeId]);
                }
            }
            nodes.update(updateArray);
        }
    }

    /**
     * Select a single node and highlight its neighborhood
     * @param {Array|string} nodeIds - Node ID(s) to select
     * @returns {Array|string} The selected node ID(s)
     */
    function selectNode(nodeIds) {
        network.selectNodes(nodeIds);
        if (window.GraphHighlighting) {
            window.GraphHighlighting.neighbourhoodHighlight({ nodes: Array.isArray(nodeIds) ? nodeIds : [nodeIds] });
        }
        return nodeIds;
    }

    /**
     * Select multiple nodes and filter the view
     * @param {Array} nodeIds - Array of node IDs to select
     * @returns {Array} The selected node IDs
     */
    function selectNodes(nodeIds) {
        network.selectNodes(nodeIds);
        filterHighlight({ nodes: nodeIds });
        return nodeIds;
    }

    /**
     * Highlight nodes/edges based on filter criteria
     * @param {Object} filterObj - Filter object with item, property, and value
     */
    function highlightFilter(filterObj) {
        filter = filterObj;
        let selectedNodes = [];
        let selectedProp = filter['property'];
        
        if (filter['item'] === 'node') {
            let allNodes = nodes.get({ returnType: "Object" });
            for (let nodeId in allNodes) {
                if (allNodes[nodeId][selectedProp] && filter['value'].includes((allNodes[nodeId][selectedProp]).toString())) {
                    selectedNodes.push(nodeId);
                }
            }
        } else if (filter['item'] === 'edge') {
            let allEdges = edges.get({ returnType: 'object' });
            // check if the selected property exists for selected edge and select the nodes connected to the edge
            for (let edge in allEdges) {
                if (allEdges[edge][selectedProp] && filter['value'].includes((allEdges[edge][selectedProp]).toString())) {
                    selectedNodes.push(allEdges[edge]['from']);
                    selectedNodes.push(allEdges[edge]['to']);
                }
            }
        }
        selectNodes(selectedNodes);
    }

    // Export to global scope
    window.GraphFiltering = {
        init: init,
        filterHighlight: filterHighlight,
        selectNode: selectNode,
        selectNodes: selectNodes,
        highlightFilter: highlightFilter
    };
})();

