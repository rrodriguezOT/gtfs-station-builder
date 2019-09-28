import React, { Component } from 'react';
import vis from 'vis';
import 'vis/dist/vis-network.min.css';
import './Vis.scss';
import Stop from '../interfaces/Stop';
import VisNode from '../interfaces/VisNode';
import VisService from '../services/VisService';
import VisEdge from '../interfaces/VisEdge';
import Communication from '../interfaces/Communication';
import Pathway from '../interfaces/Pathway';

export interface VisState {
  
}

export interface VisProps {
  data: Communication,
  onStopAdd: (node: VisNode, callback: (node?: VisNode) => void) => void,
  onStopEdit: (node: VisNode, callback: (node?: VisNode) => void) => void,
  onStopDelete: (dataToDelete: { nodes: number[], edges: number[] }, callback: (dataToDelete?: { nodes: number[], edges: number[] }) => void) => void,
  onPathwayAdd: (edge: VisEdge, callback: (edge?: VisEdge) => void) => void,
  onPathwayEdit: (edge: VisEdge, callback: (edge?: VisEdge) => void) => void,
  onPathwayDelete: (dataToDelete: { nodes: number[], edges: number[] }, callback: (dataToDelete?: { nodes: number[], edges: number[] }) => void) => void,
}

export default class Vis extends Component<VisProps, VisState> {
  componentDidMount() {
    var container = document.getElementById('vis');
    if (!container) {
      return;
    }
	
	// Transform stop coordinates into Vis x:y
	let minLat = 0;
	let minLon = 0;
	let maxLat = 0;
	let maxLon = 0;
	this.props.data.stops.forEach((stop: Stop) => {
		if (!minLat || (stop.stopLat < minLat)) {
			minLat = stop.stopLat;
		}
		if (!minLon || (stop.stopLon < minLon)) {
			minLon = stop.stopLon;
		}
		if (!maxLat || (stop.stopLat > maxLat)) {
			maxLat = stop.stopLat;
		}
		if (!maxLon || (stop.stopLon > maxLon)) {
			maxLon = stop.stopLon;
		}
	});
	let latGap = maxLat - minLat;
	let lonGap = maxLon - minLon;
	
    // get nodes from stops
	const nodes: VisNode[] = this.props.data.stops.map((stop: Stop): VisNode => {
		const node = VisService.convertStopToNode(stop);
		node.x = (stop.stopLon - minLon) / lonGap * 500;
		node.y = (maxLat - stop.stopLat) / latGap * 500;
		return node;
	});

	// get edges from pathways
	const edges: VisEdge[] = this.props.data.pathways.map((pathway: Pathway): VisEdge => {
		const edge = VisService.convertPathwayToEdge(pathway);
		return edge;
	});

    // configure vis
    var options = {
        nodes: {
        	borderWidth: 2
        },
        edges: {
			width: 2,
			selectionWidth: 3,
			smooth: true,
			font: {
				align: 'middle',
				size: 10
			}
        },
        manipulation: {
          enabled: true,
          initiallyActive: true,
          addNode: this.props.onStopAdd,
          editNode: this.props.onStopEdit,
          deleteNode: (dataToDelete: { nodes: number[], edges: number[] }, callback: (dataToDelete?: { nodes: number[], edges: number[] }) => void): void => {
			dataToDelete.edges = network.getConnectedEdges(dataToDelete.nodes[0]);
			this.props.onStopDelete(dataToDelete, callback);
		  },
          addEdge: this.props.onPathwayAdd,
          editEdge:  {
            editWithoutDrag: (edge: VisEdge, callback: (edge?: VisEdge) => void) => {
              // Get edge from DataSets because from params we can't get attached information
              let edgesDataSet = network.body.data.edges;
              edge = edgesDataSet.get(edge.id);
              this.props.onPathwayEdit(edge, callback);
            }
          },
          deleteEdge: this.props.onPathwayDelete
        },
        interaction: {
          dragView: true,
          hoverConnectedEdges: false,
          selectConnectedEdges: false,
          zoomView: true
		},
		physics: false,
        // physics: {
        //   enabled: true,
        //   barnesHut: {
        //     avoidOverlap: 1,
        //     gravitationalConstant: -0.03,
        //     centralGravity: 0,
        //     springConstant: 0,
        //     damping: 1,
        //     springLength: 200
        //   },
        //   maxVelocity: 40
		// },
		locales: {
			'gtfs': {
				edit: 'Edit',
				del: 'Delete selected',
				back: 'Back',
				addNode: 'Add Location',
				addEdge: 'Add Pathway',
				editNode: 'Edit Location',
				editEdge: 'Edit Pathway',
				addDescription: 'Click in an empty space to place a new location.',
				edgeDescription: 'Click on a location and drag the pathway to another location to connect them.',
				editEdgeDescription: 'Click on the control points and drag them to a location to connect to it.',
				createEdgeError: 'Cannot link pathways to a cluster.',
				deleteClusterError: 'Clusters cannot be deleted.',
				editClusterError: 'Clusters cannot be edited.'
			}
		},
		locale: 'gtfs'
    };
    let network = new vis.Network(container, {nodes, edges}, options);

    network.on("doubleClick", () => {
      let selection = network.getSelection();
      if (selection.nodes.length === 1) {
        network.editNode();
      }
      else if (selection.edges.length === 1) {
        network.editEdgeMode();
      }
	});
	
	// network.on("stabilized", () => {
	// 	network.setOptions({
	// 		physics: false
	// 	});
	// });
  }

  render() {
    return (
      <div id="vis"></div>
    );
  }
}
