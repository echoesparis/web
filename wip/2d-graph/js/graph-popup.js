/**
 * Popup/tooltip functionality for the graph
 * Handles custom popup display on node hover
 */
(function() {
    'use strict';

    let popup = null;
    let popupTimeout = null;
    let nodes = null;
    let network = null;
    let container = null;

    /**
     * Initialize the popup module with required dependencies
     * @param {HTMLElement} containerElement - The container element for the graph
     * @param {vis.DataSet} nodesDataSet - The nodes DataSet
     * @param {vis.Network} networkInstance - The network instance
     */
    function init(containerElement, nodesDataSet, networkInstance) {
        container = containerElement;
        nodes = nodesDataSet;
        network = networkInstance;

        // Create popup element
        popup = document.createElement("div");
        popup.className = 'popup';
        popupTimeout = null;
        
        popup.addEventListener('mouseover', function () {
            if (popupTimeout !== null) {
                clearTimeout(popupTimeout);
                popupTimeout = null;
            }
        });
        
        popup.addEventListener('mouseout', function () {
            if (popupTimeout === null) {
                hidePopup();
            }
        });
        
        container.appendChild(popup);

        // Set up network event handlers
        network.on("showPopup", function (params) {
            showPopup(params);
        });

        network.on("hidePopup", function (params) {
            hidePopup();
        });
    }

    /**
     * Hide the popup with a delay
     */
    function hidePopup() {
        popupTimeout = setTimeout(function () {
            if (popup) {
                popup.style.display = 'none';
            }
        }, 500);
    }

    /**
     * Show the popup for a specific node
     * @param {string} nodeId - The ID of the node to show popup for
     */
    function showPopup(nodeId) {
        // get the data from the vis.DataSet
        var nodeData = nodes.get([nodeId]);
        if (!nodeData || nodeData.length === 0) {
            return;
        }
        
        popup.innerHTML = nodeData[0].title;

        // get the position of the node
        var posCanvas = network.getPositions([nodeId])[nodeId];

        // get the bounding box of the node
        var boundingBox = network.getBoundingBox(nodeId);

        // position tooltip:
        posCanvas.x = posCanvas.x + 0.5 * (boundingBox.right - boundingBox.left);

        // convert coordinates to the DOM space
        var posDOM = network.canvasToDOM(posCanvas);

        // Give it an offset
        posDOM.x += 10;
        posDOM.y -= 20;

        // show and place the tooltip.
        popup.style.display = 'block';
        popup.style.top = posDOM.y + 'px';
        popup.style.left = posDOM.x + 'px';
    }

    // Export to global scope
    window.GraphPopup = {
        init: init,
        showPopup: showPopup,
        hidePopup: hidePopup
    };
})();

