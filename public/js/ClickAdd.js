let dataVizExt;
let dbIdNameMap = new Map();
let devices = [];

// Select Floor and add sprites
async function addPoint(viewer, model) {
  // Remove existing sprites
  dataVizExt.removeAllViewables();

  // Load level data
  let viewerDocument = model.getDocumentNode().getDocument();
  const aecModelData = await viewerDocument.downloadAecModelData();
  let levelsExt;
  if (aecModelData) {
    levelsExt = await viewer.loadExtension("Autodesk.AEC.LevelsExtension", {
      doNotCreateUI: true,
    });
  }

  // Select Level 3.
  const floorData = levelsExt.floorSelector.floorData;
  const floor = floorData[2];
  levelsExt.floorSelector.selectFloor(floor.index, true);

  const viewableData = new Autodesk.DataVisualization.Core.ViewableData();
  viewableData.spriteSize = 16;

  // Add viewables
  devices.forEach((device, index) => {
    const style = styleMap[device.type] || styleMap["default"];
    const viewable = new Autodesk.DataVisualization.Core.SpriteViewable(
      device.position,
      style,
      index + 1
    );

    viewableData.addViewable(viewable);
  });

  await viewableData.finish();
  dataVizExt.addViewables(viewableData);

  // Generate surfaceshading data by mapping devices to rooms.
  const structureInfo = new Autodesk.DataVisualization.Core.ModelStructureInfo(
    model
  );
  const heatmapData = await structureInfo.generateSurfaceShadingData(devices);

  // Setup surfaceshading
  await dataVizExt.setupSurfaceShading(model, heatmapData);

  dataVizExt.registerSurfaceShadingColors("co2", [0x00ff00, 0xff0000]);
  dataVizExt.registerSurfaceShadingColors("temperature", [0xff0000, 0x0000ff]);

  /**
   * Interface for application to decide the current value for the heatmap
   * @param {Object} device device
   * @param {string} sensorType sensor type
   */
  function getSensorValue(device, sensorType) {
    let value = Math.random();
    return value;
  }

  dataVizExt.renderSurfaceShading(floor.name, "temperature", getSensorValue);
}

/**
 * Function to extract the properties of a selected point from the Viewer.
 * @param {number} dbId The DbID of the selected point.
 * @param {Autodesk.Viewing.GuiViewer3D} viewer
 * @returns {Promise} A promise that resolves to the name property of the selected point.
 */
function getPropertiesFromDbId(dbId, viewer) {
  return new Promise((resolve, reject) => {
    viewer.getProperties(
      dbId,
      function (e) {
        var name = e.name;
        resolve(name);
      },
      (error) => {
        reject(error);
      }
    );
  });
}
/**
 * Handles the 'POINT_SELECTION_CHANGE' event.
 * Generates a JSON object representing a {@link RoomDevice} based on the selected point on the Viewer canvas.
 * @param {Object} event Click event indicating that the user has selected a point on the loaded model.
 * @param {Object} event.clickInfo The selection point which is passed through the event
 * @param {number} event.clickInfo.dbId The dbId of the selection point
 * @param {{x:number, y:number, z:number}} event.clickInfo.point The position information of the selection point
 */
async function onClickSelection(event) {
  if (event.dbId == 0) {
    // User clicked an area with no sprites
    var sp = event.clickInfo;
    const viewer = event.target;
    const model = event.clickInfo.model;

    //Generate an id for the sensorPoint.
    var spId;

    // Check if we already extracted properties of the selected point
    if (dbIdNameMap.has(sp.dbId)) {
      let dbProp = dbIdNameMap.get(sp.dbId);
      dbProp.index++;
      spId = dbProp.name + "-" + dbProp.index;
    } else {
      // Extract name for selected point from viewer
      var name = await getPropertiesFromDbId(sp.dbId, viewer);
      dbIdNameMap.set(sp.dbId, { name: name, index: 1 });
      spId = name + "-1";
    }

    /** @type {RoomDevice} An object that defines the structure of a Device in a Room. */
    var sensorPoint = {
      id: spId,
      dbId: sp.dbId,
      position: sp.point,
      type: "my-sensor-type",
      sensorTypes: ["temperature"],
    };

    devices.push(sensorPoint);

    // Generate viewables for the updated devices list
    addPoint(viewer, model);
  }
}
