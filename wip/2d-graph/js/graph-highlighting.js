/**
 * Neighborhood highlighting functionality for the graph
 * Highlights nodes based on their connection degree to selected nodes
 */
(function() {
    'use strict';

    let highlightActive = false;
    let nodeColors = {};
    let nodes = null;
    let network = null;

    /**
     * Initialize the highlighting module with required dependencies
     * @param {vis.DataSet} nodesDataSet - The nodes DataSet
     * @param {vis.Network} networkInstance - The network instance
     * @param {Object} nodeColorsMap - Map of node IDs to their original colors
     */
    function init(nodesDataSet, networkInstance, nodeColorsMap) {
        nodes = nodesDataSet;
        network = networkInstance;
        nodeColors = nodeColorsMap;
    }

    /**
     * Highlight neighborhood of selected nodes
     * @param {Object} params - Event parameters with nodes array
     */
    function neighbourhoodHighlight(params) {
        let allNodes = nodes.get({ returnType: "Object" });
        
        // if something is selected:
        if (params.nodes.length > 0) {
            highlightActive = true;
            var i, j;
            var selectedNode = params.nodes[0];
            var degrees = 2;

            // mark all nodes as hard to read.
            for (let nodeId in allNodes) {
                allNodes[nodeId].color = "rgba(200,200,200,0.5)";
                if (allNodes[nodeId].hiddenLabel === undefined) {
                    allNodes[nodeId].hiddenLabel = allNodes[nodeId].label;
                    allNodes[nodeId].label = undefined;
                }
            }
            var connectedNodes = network.getConnectedNodes(selectedNode);
            var allConnectedNodes = [];

            // get the second degree nodes
            for (i = 1; i < degrees; i++) {
                for (j = 0; j < connectedNodes.length; j++) {
                    allConnectedNodes = allConnectedNodes.concat(
                        network.getConnectedNodes(connectedNodes[j])
                    );
                }
            }

            // all second degree nodes get a different color and their label back
            for (i = 0; i < allConnectedNodes.length; i++) {
                allNodes[allConnectedNodes[i]].color = "rgba(150,150,150,0.75)";
                if (allNodes[allConnectedNodes[i]].hiddenLabel !== undefined) {
                    allNodes[allConnectedNodes[i]].label =
                        allNodes[allConnectedNodes[i]].hiddenLabel;
                    allNodes[allConnectedNodes[i]].hiddenLabel = undefined;
                }
            }

            // all first degree nodes get their own color and their label back
            for (i = 0; i < connectedNodes.length; i++) {
                allNodes[connectedNodes[i]].color = nodeColors[connectedNodes[i]];
                if (allNodes[connectedNodes[i]].hiddenLabel !== undefined) {
                    allNodes[connectedNodes[i]].label =
                        allNodes[connectedNodes[i]].hiddenLabel;
                    allNodes[connectedNodes[i]].hiddenLabel = undefined;
                }
            }

            // the main node gets its own color and its label back.
            allNodes[selectedNode].color = nodeColors[selectedNode];
            if (allNodes[selectedNode].hiddenLabel !== undefined) {
                allNodes[selectedNode].label = allNodes[selectedNode].hiddenLabel;
                allNodes[selectedNode].hiddenLabel = undefined;
            }
        } else if (highlightActive === true) {
            // reset all nodes
            for (let nodeId in allNodes) {
                allNodes[nodeId].color = nodeColors[nodeId];
                if (allNodes[nodeId].hiddenLabel !== undefined) {
                    allNodes[nodeId].label = allNodes[nodeId].hiddenLabel;
                    allNodes[nodeId].hiddenLabel = undefined;
                }
            }
            highlightActive = false;
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

    // Export to global scope
    window.GraphHighlighting = {
        init: init,
        neighbourhoodHighlight: neighbourhoodHighlight
    };
})();

