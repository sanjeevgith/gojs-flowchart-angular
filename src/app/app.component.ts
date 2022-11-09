
import { ChangeDetectorRef, Component, ViewChild, ViewEncapsulation } from '@angular/core';
import * as go from 'gojs';
import { DataSyncService, DiagramComponent, PaletteComponent } from 'gojs-angular';
import produce from "immer";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom
})
export class AppComponent {

  @ViewChild('myDiagram', { static: true }) public myDiagramComponent: DiagramComponent;
  @ViewChild('myPalette', { static: true }) public myPaletteComponent: PaletteComponent;


  public state = {
    // Diagram state props
    diagramNodeData: [
      // { id: 'Alpha', text: "Alpha", color: 'lightblue', loc: "0 0" },
      // { id: 'Beta', text: "Beta", color: 'orange', loc: "100 0" },
      // { id: 'Gamma', text: "Gamma", color: 'lightgreen', loc: "0 100" },
      // { id: 'Delta', text: "Delta", color: 'pink', loc: "100 100" }
    ],
    diagramLinkData: [
      { key: -1, from: 'Alpha', to: 'Beta', fromPort: 'r', toPort: '1' },
      { key: -2, from: 'Alpha', to: 'Gamma', fromPort: 'b', toPort: 't' },
      { key: -3, from: 'Beta', to: 'Beta' },
      { key: -4, from: 'Gamma', to: 'Delta', fromPort: 'r', toPort: 'l' },
      { key: -5, from: 'Delta', to: 'Alpha', fromPort: 't', toPort: 'r' }
    ],
    diagramModelData: { prop: 'value' },
    skipsDiagramUpdate: false,
    selectedNodeData: null, // used by InspectorComponent

    // Palette state props
    paletteNodeData: [
      // { key: 'Epsilon', text: 'Epsilon', color: 'red' },
      // { key: 'Kappa', text: 'Kappa', color: 'purple' },
      { category: "Start", text: "Start" },
      { category: "Step", text: "Step" },
      { category: "Conditional", text: "???" },
      { category: "End", text: "End" },
      { category: "Comment", text: "Comment" }
    ],
    paletteModelData: { prop: 'val' }
  };

  public diagramDivClassName: string = 'myDiagramDiv';
  public paletteDivClassName = 'myPaletteDiv';
  dia: any
  // initialize diagram / templates
  public initDiagram(): go.Diagram {

    const $ = go.GraphObject.make;
    this.dia = $(go.Diagram, {
      'undoManager.isEnabled': true,
      'clickCreatingTool.archetypeNodeData': { text: 'new node', color: 'lightblue' },
      model: $(go.GraphLinksModel,
        {
          nodeKeyProperty: 'id',
          linkToPortIdProperty: 'toPort',
          linkFromPortIdProperty: 'fromPort',
          linkKeyProperty: 'key' // IMPORTANT! must be defined for merges and data sync when using GraphLinksModel
        }
      )
    });

    this.dia.commandHandler.archetypeGroupData = { key: 'Group', isGroup: true };


    const makePort = function (name: any, align: any, spot: any, output: any, input: any) {
      var horizontal = align.equals(go.Spot.Top) || align.equals(go.Spot.Bottom);
      // the port is basically just a transparent rectangle that stretches along the side of the node,
      // and becomes colored when the mouse passes over it
      return $(go.Shape,
        {
          fill: "transparent",  // changed to a color in the mouseEnter event handler
          strokeWidth: 0,  // no stroke
          width: horizontal ? NaN : 8,  // if not stretching horizontally, just 8 wide
          height: !horizontal ? NaN : 8,  // if not stretching vertically, just 8 tall
          alignment: align,  // align the port on the main Shape
          stretch: (horizontal ? go.GraphObject.Horizontal : go.GraphObject.Vertical),
          portId: name,  // declare this object to be a "port"
          fromSpot: spot,  // declare where links may connect at this port
          fromLinkable: output,  // declare whether the user may draw links from here
          toSpot: spot,  // declare where links may connect at this port
          toLinkable: input,  // declare whether the user may draw links to here
          cursor: "pointer",  // show a different cursor to indicate potential link point
          mouseEnter: (e: any, port: any) => {  // the PORT argument will be this Shape
            if (!e.diagram.isReadOnly) port.fill = "rgba(255,0,255,0.5)";
          },
          mouseLeave: (e: any, port: any) => port.fill = "transparent"
        });
    }

    function textStyle() {
      return {
        font: "bold 11pt Lato, Helvetica, Arial, sans-serif",
        stroke: "#F8F8F8"
      }
    }
    function nodeStyle() {
      return [
        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
        {
          locationSpot: go.Spot.Center
        }
      ];
    }







    this.dia.nodeTemplateMap.add("",
      $(go.Node, "Table", nodeStyle(),
        // the main object is a Panel that surrounds a TextBlock with a rectangular Shape
        $(go.Panel, "Auto",
          $(go.Shape, "Rectangle",
            { fill: "#282c34", stroke: "#00A9C9", strokeWidth: 3.5 },
            new go.Binding("figure", "figure")),
          $(go.TextBlock, textStyle(),
            {
              margin: 8,
              maxSize: new go.Size(160, NaN),
              wrap: go.TextBlock.WrapFit,
              editable: true
            },
            new go.Binding("text").makeTwoWay())
        ),
        // four named ports, one on each side:
        makePort("T", go.Spot.Top, go.Spot.TopSide, false, true),
        makePort("L", go.Spot.Left, go.Spot.LeftSide, true, true),
        makePort("R", go.Spot.Right, go.Spot.RightSide, true, true),
        makePort("B", go.Spot.Bottom, go.Spot.BottomSide, true, false)
      ));
    this.dia.nodeTemplateMap.add("Conditional",
      $(go.Node, "Table", nodeStyle(),
        // the main object is a Panel that surrounds a TextBlock with a rectangular Shape
        $(go.Panel, "Auto",
          $(go.Shape, "Diamond",
            { fill: "#282c34", stroke: "#00A9C9", strokeWidth: 3.5 },
            new go.Binding("figure", "figure")),
          $(go.TextBlock, textStyle(),
            {
              margin: 8,
              maxSize: new go.Size(160, NaN),
              wrap: go.TextBlock.WrapFit,
              editable: true
            },
            new go.Binding("text").makeTwoWay())
        ),
        // four named ports, one on each side:
        makePort("T", go.Spot.Top, go.Spot.Top, false, true),
        makePort("L", go.Spot.Left, go.Spot.Left, true, true),
        makePort("R", go.Spot.Right, go.Spot.Right, true, true),
        makePort("B", go.Spot.Bottom, go.Spot.Bottom, true, false)
      ));
    this.dia.nodeTemplateMap.add("Start",
      $(go.Node, "Table", nodeStyle(),
        $(go.Panel, "Spot",
          $(go.Shape, "Circle",
            { desiredSize: new go.Size(70, 70), fill: "#282c34", stroke: "#09d3ac", strokeWidth: 3.5 }),
          $(go.TextBlock, "Start", textStyle(),
            new go.Binding("text"))
        ),
        // three named ports, one on each side except the top, all output only:
        makePort("L", go.Spot.Left, go.Spot.Left, true, false),
        makePort("R", go.Spot.Right, go.Spot.Right, true, false),
        makePort("B", go.Spot.Bottom, go.Spot.Bottom, true, false)
      ));
    this.dia.nodeTemplateMap.add("End",
      $(go.Node, "Table", nodeStyle(),
        $(go.Panel, "Spot",
          $(go.Shape, "Circle",
            { desiredSize: new go.Size(60, 60), fill: "#282c34", stroke: "#DC3C00", strokeWidth: 3.5 }),
          $(go.TextBlock, "End", textStyle(),
            new go.Binding("text"))
        ),
        // three named ports, one on each side except the bottom, all input only:
        makePort("T", go.Spot.Top, go.Spot.Top, false, true),
        makePort("L", go.Spot.Left, go.Spot.Left, false, true),
        makePort("R", go.Spot.Right, go.Spot.Right, false, true)
      ));
    go.Shape.defineFigureGenerator("File", (shape, w, h) => {
      var geo = new go.Geometry();
      var fig = new go.PathFigure(0, 0, true); // starting point
      geo.add(fig);
      fig.add(new go.PathSegment(go.PathSegment.Line, .75 * w, 0));
      fig.add(new go.PathSegment(go.PathSegment.Line, w, .25 * h));
      fig.add(new go.PathSegment(go.PathSegment.Line, w, h));
      fig.add(new go.PathSegment(go.PathSegment.Line, 0, h).close());
      var fig2 = new go.PathFigure(.75 * w, 0, false);
      geo.add(fig2);
      // The Fold
      fig2.add(new go.PathSegment(go.PathSegment.Line, .75 * w, .25 * h));
      fig2.add(new go.PathSegment(go.PathSegment.Line, w, .25 * h));
      geo.spot1 = new go.Spot(0, .25);
      geo.spot2 = go.Spot.BottomRight;
      return geo;
    });
    this.dia.nodeTemplateMap.add("Comment",
      $(go.Node, "Auto", nodeStyle(),
        $(go.Shape, "File",
          { fill: "#282c34", stroke: "#DEE0A3", strokeWidth: 3 }),
        $(go.TextBlock, textStyle(),
          {
            margin: 8,
            maxSize: new go.Size(200, NaN),
            wrap: go.TextBlock.WrapFit,
            textAlign: "center",
            editable: true
          },
          new go.Binding("text").makeTwoWay())
        // no ports, because no links are allowed to connect with a comment
      ));





    return this.dia;
  }




  public printDiagram() {
    var svgWindow = window.open();
    if (!svgWindow) return;  // failure to open a new Window
    var printSize = new go.Size(700, 960);
    var bnds = this.dia.documentBounds;
    var x = bnds.x;
    var y = bnds.y;
    while (y < bnds.bottom) {
      while (x < bnds.right) {
        var svg = this.dia.makeSvg({ scale: 1.0, position: new go.Point(x, y), size: printSize });
        svgWindow.document.body.appendChild(svg);
        x += printSize.width;
      }
      x = bnds.x;
      y += printSize.height;
    }
    setTimeout(() => svgWindow.print(), 1);
  }

  // When the diagram model changes, update app data to reflect those changes. Be sure to use immer's "produce" function to preserve immutability
  public diagramModelChange = function (changes: go.IncrementalData) {
    if (!changes) return;
    const appComp = this;
    this.state = produce(this.state, draft => {
      // set skipsDiagramUpdate: true since GoJS already has this update
      // this way, we don't log an unneeded transaction in the Diagram's undoManager history
      draft.skipsDiagramUpdate = true;
      draft.diagramNodeData = DataSyncService.syncNodeData(changes, draft.diagramNodeData, appComp.observedDiagram.model);
      draft.diagramLinkData = DataSyncService.syncLinkData(changes, draft.diagramLinkData, appComp.observedDiagram.model);
      draft.diagramModelData = DataSyncService.syncModelData(changes, draft.diagramModelData);
      // If one of the modified nodes was the selected node used by the inspector, update the inspector selectedNodeData object
      const modifiedNodeDatas = changes.modifiedNodeData;
      if (modifiedNodeDatas && draft.selectedNodeData) {
        for (let i = 0; i < modifiedNodeDatas.length; i++) {
          const mn = modifiedNodeDatas[i];
          const nodeKeyProperty = appComp.myDiagramComponent.diagram.model.nodeKeyProperty as string;
          if (mn[nodeKeyProperty] === draft.selectedNodeData[nodeKeyProperty]) {
            draft.selectedNodeData = mn;
          }
        }
      }
    });
  };


  save() {
    (<HTMLInputElement>document.getElementById("mySavedModel")).value = this.dia.model.toJson();
    this.dia.isModified = false;
  }
  load() {
    this.dia.model = go.Model.fromJson((<HTMLInputElement>document.getElementById("mySavedModel")).value);
    console.log("load working")
  }

  palette: any
  public initPalette(): go.Palette {
    const $ = go.GraphObject.make;
    this.palette = $(go.Palette);

    // define the Node template

    // this.palette.nodeTemplate =
    // $(go.Node, 'Auto',
    //   $(go.Shape, 'Diamond',
    //     {
    //       stroke: null
    //     },
    //     new go.Binding('fill', 'color')
    //   ),
    //   $(go.TextBlock, { margin: 8 },
    //     new go.Binding('text', 'key'))
    // );


    const makePort = function (name: any, align: any, spot: any, output: any, input: any) {
      var horizontal = align.equals(go.Spot.Top) || align.equals(go.Spot.Bottom);
      // the port is basically just a transparent rectangle that stretches along the side of the node,
      // and becomes colored when the mouse passes over it
      return $(go.Shape,
        {
          fill: "transparent",  // changed to a color in the mouseEnter event handler
          strokeWidth: 0,  // no stroke
          width: horizontal ? NaN : 8,  // if not stretching horizontally, just 8 wide
          height: !horizontal ? NaN : 8,  // if not stretching vertically, just 8 tall
          alignment: align,  // align the port on the main Shape
          stretch: (horizontal ? go.GraphObject.Horizontal : go.GraphObject.Vertical),
          portId: name,  // declare this object to be a "port"
          fromSpot: spot,  // declare where links may connect at this port
          fromLinkable: output,  // declare whether the user may draw links from here
          toSpot: spot,  // declare where links may connect at this port
          toLinkable: input,  // declare whether the user may draw links to here
          cursor: "pointer",  // show a different cursor to indicate potential link point
          mouseEnter: (e: any, port: any) => {  // the PORT argument will be this Shape
            if (!e.diagram.isReadOnly) port.fill = "rgba(255,0,255,0.5)";
          },
          mouseLeave: (e: any, port: any) => port.fill = "transparent"
        });
    }

    function textStyle() {
      return {
        font: "bold 11pt Lato, Helvetica, Arial, sans-serif",
        stroke: "#F8F8F8"
      }
    }
    function nodeStyle() {
      return [
        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
        {
          locationSpot: go.Spot.Center
        }
      ];
    }

    this.palette.nodeTemplateMap.add("",
      $(go.Node, "Table", nodeStyle(),
        // the main object is a Panel that surrounds a TextBlock with a rectangular Shape
        $(go.Panel, "Auto",
          $(go.Shape, "Rectangle",
            { fill: "#282c34", stroke: "#00A9C9", strokeWidth: 3.5 },
            new go.Binding("figure", "figure")),
          $(go.TextBlock, textStyle(),
            {
              margin: 8,
              maxSize: new go.Size(160, NaN),
              wrap: go.TextBlock.WrapFit,
              editable: true
            },
            new go.Binding("text").makeTwoWay())
        ),
        // four named ports, one on each side:
        makePort("T", go.Spot.Top, go.Spot.TopSide, false, true),
        makePort("L", go.Spot.Left, go.Spot.LeftSide, true, true),
        makePort("R", go.Spot.Right, go.Spot.RightSide, true, true),
        makePort("B", go.Spot.Bottom, go.Spot.BottomSide, true, false)
      ));

    this.palette.nodeTemplateMap.add("Conditional",
      $(go.Node, "Table", nodeStyle(),
        // the main object is a Panel that surrounds a TextBlock with a rectangular Shape
        $(go.Panel, "Auto",
          $(go.Shape, "Diamond",
            { fill: "#282c34", stroke: "#00A9C9", strokeWidth: 3.5 },
            new go.Binding("figure", "figure")),
          $(go.TextBlock, textStyle(),
            {
              margin: 8,
              maxSize: new go.Size(160, NaN),
              wrap: go.TextBlock.WrapFit,
              editable: true
            },
            new go.Binding("text").makeTwoWay())
        ),
        // four named ports, one on each side:
        makePort("T", go.Spot.Top, go.Spot.Top, false, true),
        makePort("L", go.Spot.Left, go.Spot.Left, true, true),
        makePort("R", go.Spot.Right, go.Spot.Right, true, true),
        makePort("B", go.Spot.Bottom, go.Spot.Bottom, true, false)
      ));

    this.palette.nodeTemplateMap.add("Start",
      $(go.Node, "Table", nodeStyle(),
        $(go.Panel, "Spot",
          $(go.Shape, "Circle",
            { desiredSize: new go.Size(70, 70), fill: "#282c34", stroke: "#09d3ac", strokeWidth: 3.5 }),
          $(go.TextBlock, "Start", textStyle(),
            new go.Binding("text"))
        ),
        // three named ports, one on each side except the top, all output only:
        makePort("L", go.Spot.Left, go.Spot.Left, true, false),
        makePort("R", go.Spot.Right, go.Spot.Right, true, false),
        makePort("B", go.Spot.Bottom, go.Spot.Bottom, true, false)
      ));

    this.palette.nodeTemplateMap.add("End",
      $(go.Node, "Table", nodeStyle(),
        $(go.Panel, "Spot",
          $(go.Shape, "Circle",
            { desiredSize: new go.Size(60, 60), fill: "#282c34", stroke: "#DC3C00", strokeWidth: 3.5 }),
          $(go.TextBlock, "End", textStyle(),
            new go.Binding("text"))
        ),
        // three named ports, one on each side except the bottom, all input only:
        makePort("T", go.Spot.Top, go.Spot.Top, false, true),
        makePort("L", go.Spot.Left, go.Spot.Left, false, true),
        makePort("R", go.Spot.Right, go.Spot.Right, false, true)
      ));

    go.Shape.defineFigureGenerator("File", (shape, w, h) => {
      var geo = new go.Geometry();
      var fig = new go.PathFigure(0, 0, true); // starting point
      geo.add(fig);
      fig.add(new go.PathSegment(go.PathSegment.Line, .75 * w, 0));
      fig.add(new go.PathSegment(go.PathSegment.Line, w, .25 * h));
      fig.add(new go.PathSegment(go.PathSegment.Line, w, h));
      fig.add(new go.PathSegment(go.PathSegment.Line, 0, h).close());
      var fig2 = new go.PathFigure(.75 * w, 0, false);
      geo.add(fig2);
      // The Fold
      fig2.add(new go.PathSegment(go.PathSegment.Line, .75 * w, .25 * h));
      fig2.add(new go.PathSegment(go.PathSegment.Line, w, .25 * h));
      geo.spot1 = new go.Spot(0, .25);
      geo.spot2 = go.Spot.BottomRight;
      return geo;
    });

    this.palette.nodeTemplateMap.add("Comment",
      $(go.Node, "Auto", nodeStyle(),
        $(go.Shape, "File",
          { fill: "#282c34", stroke: "#DEE0A3", strokeWidth: 3 }),
        $(go.TextBlock, textStyle(),
          {
            margin: 8,
            maxSize: new go.Size(200, NaN),
            wrap: go.TextBlock.WrapFit,
            textAlign: "center",
            editable: true
          },
          new go.Binding("text").makeTwoWay())
        // no ports, because no links are allowed to connect with a comment
      ));



    this.palette.model = $(go.GraphLinksModel);
    return this.palette;
  }
  public animateFadeDown(e) {
    var diagram = e.diagram;
    var animation = new go.Animation();
    animation.isViewportUnconstrained = true; // So Diagram positioning rules let the animation start off-screen
    animation.easing = go.Animation.EaseOutExpo;
    animation.duration = 900;
    // Fade "down", in other words, fade in from above
    animation.add(diagram, 'position', diagram.position.copy().offset(0, 200), diagram.position);
    animation.add(diagram, 'opacity', 0, 1);
    animation.start();
  }

  constructor(private cdr: ChangeDetectorRef) { }








  // Overview Component testing
  public oDivClassName = 'myOverviewDiv';
  public initOverview(): go.Overview {
    const $ = go.GraphObject.make;
    const overview = $(go.Overview);
    return overview;
  }
  public observedDiagram = null;

  // currently selected node; for inspector
  public selectedNodeData: go.ObjectData = null;

  public ngAfterViewInit() {
    if (this.observedDiagram) return;
    this.observedDiagram = this.myDiagramComponent.diagram;
    this.cdr.detectChanges(); // IMPORTANT: without this, Angular will throw ExpressionChangedAfterItHasBeenCheckedError (dev mode only)

    const appComp: AppComponent = this;
    // listener for inspector
    this.myDiagramComponent.diagram.addDiagramListener('ChangedSelection', function (e) {
      if (e.diagram.selection.count === 0) {
        appComp.selectedNodeData = null;
      }
      const node = e.diagram.selection.first();
      appComp.state = produce(appComp.state, draft => {
        if (node instanceof go.Node) {
          var idx = draft.diagramNodeData.findIndex(nd => nd.id == node.data.id);
          var nd = draft.diagramNodeData[idx];
          draft.selectedNodeData = nd;
        } else {
          draft.selectedNodeData = null;
        }
      });
    });
  } // end ngAfterViewInit


  /**
   * Update a node's data based on some change to an inspector row's input
   * @param changedPropAndVal An object with 2 entries: "prop" (the node data prop changed), and "newVal" (the value the user entered in the inspector <input>)
   */
  public handleInspectorChange(changedPropAndVal) {

    const path = changedPropAndVal.prop;
    const value = changedPropAndVal.newVal;

    this.state = produce(this.state, draft => {
      var data = draft.selectedNodeData;
      data[path] = value;
      const key = data.id;
      const idx = draft.diagramNodeData.findIndex(nd => nd.id == key);
      if (idx >= 0) {
        draft.diagramNodeData[idx] = data;
        draft.skipsDiagramUpdate = false; // we need to sync GoJS data with this new app state, so do not skips Diagram update
      }
    });
  }


}

