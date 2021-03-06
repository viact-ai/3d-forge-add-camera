let viewer;
let snapshotListner;
const urn =
  "urn:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6N3F4cHdndzl1eXl5eGQwZGJzeHdycmt2bWtwdGpiYmctZm9yZ2V0ZXN0YnVja2V0L0NvbW11bml0eV9TY2hvb2wuM2Rz";
const sensorStyleDefinitions = {
  co2: {
    url: "https://d2zqnmauvnpnnm.cloudfront.net/assets-1/images/co2.svg",
    color: 0xffffff,
  },
  temperature: {
    url: "https://d2zqnmauvnpnnm.cloudfront.net/assets-1/images/thermometer.svg",
    color: 0xffffff,
  },
  default: {
    url: "https://d2zqnmauvnpnnm.cloudfront.net/assets-1/images/circle.svg",
    color: 0xffffff,
  },
};
const devices = [
  {
    id: "Hall I",
    position: {
      x: -121.24988486549135,
      y: -4.766496336003649,
      z: 91.73100476199237,
    },
    type: "temperature",
    sensorTypes: ["temperature"],
    active: true,
  },
  {
    id: "Hall IV",
    position: {
      x: 142.3636071439261,
      y: -2.093410951315228,
      z: -100.14377696546723,
    },
    type: "combo",
    sensorTypes: ["co2", "temperature"],
  },
];

let dataVizExt;
let dbIdNameMap = new Map();
var styleMap = {};

$(document).ready(function () {
  // first, check if current visitor is signed in
  getForgeToken(function (res) {
    // yes, it is signed in...
    // finally:
    initPage();
  });
});

function initPage() {
  const av = Autodesk.Viewing;
  const options = {
    env: "AutodeskProduction",
    getAccessToken: getForgeToken,
    api: "derivativeV2",
  };

  Autodesk.Viewing.Initializer(options, async () => {
    viewer = new Autodesk.Viewing.GuiViewer3D(
      document.getElementById("forgeViewer"),
      { extensions: ["Autodesk.DocumentBrowser"] }
    );

    const startedCode = viewer.start(
      undefined,
      undefined,
      undefined,
      undefined,
      options
    );
    if (startedCode > 0) {
      console.error("Failed to create a Viewer: WebGL not supported.");
      return;
    }

    console.log("Initialization complete, loading a model next...");
    viewer.addEventListener(av.GEOMETRY_LOADED_EVENT, onModelLoaded, {
      once: true,
    });

    loadModel(viewer);
  });

  function loadModel(viewer) {
    Autodesk.Viewing.Document.load(
      urn,
      onDocumentLoadSuccess,
      onDocumentLoadFailure
    );

    function onDocumentLoadSuccess(viewerDocument) {
      viewer.impl.toggleGroundShadow(true);
      const adskViewer = document.querySelector(".adsk-viewing-viewer");
      const preview_snapshot = document.createElement("div");
      preview_snapshot.id = "preview_snapshot";
      adskViewer.appendChild(preview_snapshot);

      // load the default view
      const viewables = viewerDocument.getRoot().getDefaultGeometry();
      viewer.loadDocumentNode(viewerDocument, viewables).then((model) => {
        // any additional action here?
        mainModel = model;
      });
    }

    function onDocumentLoadFailure() {
      console.error("Failed fetching Forge manifest");
    }
  }
}

/**
 *
 * @param {*} position x, y , z of device
 */
function showSnapshot(position) {
  const preview_snapshot = document.getElementById("preview_snapshot");
  const url =
    "https://cdn1.vectorstock.com/i/1000x1000/59/40/flat-line-hong-kong-banner-vector-18155940.jpg";
  preview_snapshot.innerHTML = `<img src="${url}" width="100%">`;
  if (snapshotListner) {
    viewer.removeEventListener(snapshotListner);
  }
  snapshotListner = viewer.addEventListener(
    Autodesk.Viewing.CAMERA_CHANGE_EVENT,
    function (event) {
      console.log(event);
      const canvasCoords = viewer.worldToClient(position);
      preview_snapshot.style.left = canvasCoords.x + "px";
      preview_snapshot.style.top = canvasCoords.y + "px";
    }
  );
}

function showCamerasList() {
  const cam_list_container = document.getElementById("camera_list");
  cam_list_container.innerHTML = "";
  const cam_list = document.createElement("ul");
  cam_list.id = "camera_list-group";
  cam_list.className = "list-group";

  devices.forEach((device) => {
    const cam = document.createElement("li");
    cam.textContent = device.id;
    cam.classList.add("list-group-item");
    cam.addEventListener("click", () => {
      console.log(device);
      viewer.navigation.setPosition(device.cameraPosition || device.position);
      showSnapshot(device.position);
    });
    cam_list.appendChild(cam);
  });

  cam_list_container.appendChild(cam_list);
}

// Select Floor and add sprites
async function addPoint(viewer, model) {
  // Remove existing sprites
  dataVizExt.removeAllViewables();

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
    Autodesk.Viewing.Document.load(`${cameraId}`, (doc) => {
      const viewables = doc.getRoot().getDefaultGeometry();
      viewer.loadDocumentNode(doc, viewables, {
        preserveView: true,
        keepCurrentModels: true,
        placementTransform: new THREE.Matrix4()
          .setPosition(device.position)
          .scale({ x: 0.05, y: 0.05, z: 0.05 }),
        keepCurrentModels: true,
        globalOffset: { x: 0, y: 0, z: 0 },
      });
    });
  });

  await viewableData.finish();
  dataVizExt.addViewables(viewableData);

  // Show updates
  showCamerasList();
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
  if (event.dbId == 0 && event.clickInfo) {
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

    let cameraPosition = viewer.navigation.getPosition();

    /** @type {RoomDevice} An object that defines the structure of a Device in a Room. */
    var sensorPoint = {
      id: spId,
      dbId: sp.dbId,
      position: sp.point,
      type: "my-sensor-type",
      sensorTypes: ["temperature"],
      cameraPosition,
    };
    console.log(sensorPoint);
    devices.push(sensorPoint);
    // Generate viewables for the updated devices list
    addPoint(viewer, model);
  }
}

async function onModelLoaded(data) {
  const viewer = data.target;
  const model = data.model;
  dataVizExt = await viewer.loadExtension("Autodesk.DataVisualization");
  viewer.addEventListener(
    Autodesk.DataVisualization.Core.MOUSE_CLICK,
    onClickSelection
  );

  // Create model-to-style map from style definitions.
  Object.entries(sensorStyleDefinitions).forEach(([type, styleDef]) => {
    styleMap[type] = new Autodesk.DataVisualization.Core.ViewableStyle(
      Autodesk.DataVisualization.Core.ViewableType.SPRITE,
      new THREE.Color(styleDef.color),
      styleDef.url
    );
  });

  // Generate viewables for the devices list
  addPoint(viewer, model);
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
 * Function that gives back token and expiry time
 * @param {*} callback
 */
function getForgeToken(callback) {
  fetch("/api/forge/auth/token").then((res) => {
    res.json().then((data) => {
      callback(data.access_token, data.expires_in);
    });
  });
}
