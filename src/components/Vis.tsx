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
	station: Stop,
	showStationImg: boolean;
	onStopAdd: (node: VisNode, callback: (node?: VisNode) => void) => void,
	onStopEdit: (node: VisNode, callback: (node?: VisNode) => void) => void,
	onItemDelete: (dataToDelete: { nodes: string[], edges: string[] }, callback: (dataToDelete?: { nodes: string[], edges: string[] }) => void) => void,
	onStopDragEnd: (nodeId: string, position: {x: number, y: number}, handleAllNodes?: boolean) => void,
	onPathwayAdd: (edge: VisEdge, callback: (edge?: VisEdge) => void) => void,
	onPathwayEdit: (edge: VisEdge, callback: (edge?: VisEdge) => void) => void,
	onFareZoneAdd: (position: {x: number, y: number}, callback: (nodes: VisNode[], edges: VisEdge[]) => void) => void,
	isDialogShown: boolean,
	visPhysicsOptions: any,
	onNetworkStabilized: () => void
}

export default class Vis extends Component<VisProps, VisState> {
	private network: any;

	public componentDidMount() {
		var container = document.getElementById('vis');
		if (!container) {
			return;
		}

		// get nodes from stops
		const nodes: VisNode[] = this.props.data.stops.filter((stop: Stop) => {
			return stop.locationType !== 1;
		}).map((stop: Stop): VisNode => VisService.convertStopToNode(stop));

		// get edges from pathways
		const edges: VisEdge[] = this.props.data.pathways
			.map((pathway: Pathway): VisEdge => VisService.convertPathwayToEdge(pathway));

		// configure vis
		var options = {
			// width: Math.round(VisService.visSize) + "px",
			width: "100%",
			height: Math.round(VisService.visSize) + "px",
			nodes: {
				borderWidth: 2,
				scaling: {
					label: {
						enabled: true,
						min: 16,
						max: 16
					}
				}
			},
			edges: {
				width: 1,
				selectionWidth: 2,
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
				deleteNode: (dataToDelete: { nodes: string[], edges: string[] }, callback: (dataToDelete?: { nodes: string[], edges: string[] }) => void): void => {
					dataToDelete.edges = network.getConnectedEdges(dataToDelete.nodes[0]);
					this.props.onItemDelete(dataToDelete, callback);
				},
				addEdge: this.props.onPathwayAdd,
				editEdge: (movedEdge: VisEdge, callback: (edge: VisEdge) => {}) => {
					let edgesDataSet = network.body.data.edges;
					let edge = edgesDataSet.get(movedEdge.id);
					edge.from = movedEdge.from;
					edge.to = movedEdge.to;
					edge = VisService.updatePathwayInEdge(edge);
					callback(edge);
				},
				deleteEdge: this.props.onItemDelete
			},
			interaction: {
				dragView: true,
				hoverConnectedEdges: false,
				selectConnectedEdges: false,
				zoomView: true
			},
			physics: this.props.visPhysicsOptions,
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

		let network = new vis.Network(container, { nodes, edges }, options);
		this.network = network;

		network.on("doubleClick", (e: any) => {
			const selection = network.getSelection();
			const edgesDataSet = network.body.data.edges;
			const nodesDataSet = network.body.data.nodes;
			if (e.event.srcEvent.ctrlKey) {
				const position = e.pointer.canvas;
				this.props.onFareZoneAdd(position, (nodes: VisNode[], edges: VisEdge[]) => {
					nodes.forEach((node) => {
						nodesDataSet.add(node);
					});
					edges.forEach((edge) => {
						edgesDataSet.add(edge);
					});
				});
			}
			else {
				if (selection.nodes.length === 1) {
					network.editNode();
				}
				else if (selection.edges.length === 1) {
					const edge: any = edgesDataSet.get(selection.edges[0]);
					this.props.onPathwayEdit(edge, (edge?: VisEdge) => {
						if (edge) {
							edgesDataSet.update(edge);
						}
					});
				}
				else {
					const position = e.pointer.canvas;
					const newNode: any = {
						x: position.x,
						y: position.y
					};
					this.props.onStopAdd(newNode, (node?: VisNode) => {
						if (node) {
							nodesDataSet.add(node);
						}
					})
				}
			}
		});

		network.on("oncontext", (e: any) => {
			e.event.preventDefault();
			let selection = network.getSelection();
			if (selection.edges.length === 1) {
				network.editEdgeMode();
			}
		});

		network.on("dragEnd", (e: any) => {
			if (e.nodes.length !== 0) {
				const nodeId = e.nodes[0];
				const position = e.pointer.canvas;
				this.props.onStopDragEnd(nodeId, position);
			}
		});

		network.on("stabilized", (e: any) => {
			network.storePositions();
			const positions = network.getPositions();
			const nodeIds = Object.keys(positions);
			nodeIds.forEach(nodeId => {
				this.props.onStopDragEnd(nodeId, positions[nodeId]);
			});
			this.props.onNetworkStabilized();
		});

		this.attachImage();

		const visContainer: HTMLDivElement | null = document.getElementById("vis") as HTMLDivElement;
		if (visContainer) {
			network.moveTo({
				position: {
					x: VisService.visSize - visContainer.clientWidth / 2 + 400,
					y: VisService.visSize + 400
				},
				scale: (visContainer.clientHeight - 200) / VisService.visSize
			});
		}

		document.addEventListener('keydown', this.handleDocumentKeydown);
	}

	public componentDidUpdate(prevProps: VisProps, props: VisProps) {
		if (prevProps && prevProps.station && props && props.station && (prevProps.station.stationImgUrl !== props.station.stationImgUrl)) {
			this.attachImage();
		}
	}

	private attachImage = () => {
		const station = this.props.data.stops.find(stop => stop.locationType === 1);
		if (station && station.stationImgUrl) {
			var bgImg = new Image();
			bgImg.onload = () => {
				let width: number;
				let height: number;
				if (bgImg.width > bgImg.height) {
					width = VisService.visSize;
					height = width * bgImg.height / bgImg.width;
				}
				else {
					height = VisService.visSize;
					width = height * bgImg.width / bgImg.height;
				}
				this.network.on("beforeDrawing", (ctx: CanvasRenderingContext2D) => {
					if (this.props.showStationImg) {
						ctx.save();
						ctx.globalAlpha = 0.4;
						ctx.drawImage(bgImg, 0, 0, width, height);
						ctx.restore();
					}
				});
				this.forceUpdate();
			};
			bgImg.src = station.stationImgUrl;
		}
	}

	public componentWillUnmount() {
		document.removeEventListener('keydown', this.handleDocumentKeydown);
	} 

	private handleDocumentKeydown = (e: KeyboardEvent) => {
		if (!this.props.isDialogShown && e.keyCode === 8) {
			const selection = this.network.getSelection();
			if ((selection.nodes.length === 1) || (selection.edges.length === 1)) {
				this.props.onItemDelete(selection, (dataToDelete?: { nodes: string[], edges: string[] }) => {
					if (dataToDelete) {
						this.network.deleteSelected();
					}
				});
			}
		}
	}

	render() {
		if (this.network) {
			const visOptions = this.network.getOptionsFromConfigurator();
			visOptions.physics = this.props.visPhysicsOptions;
			this.network.setOptions(visOptions);
		}

		return (
			<div id="vis"></div>
		);
	}
}
