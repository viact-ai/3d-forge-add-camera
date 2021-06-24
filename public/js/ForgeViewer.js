let viewer;

$(document).ready(function () {
  // first, check if current visitor is signed in
  getForgeToken(function (res) {
    // yes, it is signed in...
    const urn =
      "dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6N3F4cHdndzl1eXl5eGQwZGJzeHdycmt2bWtwdGpiYmctZm9yZ2V0ZXN0YnVja2V0L0NvbW11bml0eV9TY2hvb2wub2Jq";
    // finally:
    launchViewer(urn);
  });
});

// @urn the model to show
// @viewablesId which viewables to show, applies to BIM 360 Plans folder
function launchViewer(urn) {
  var options = {
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
    dataVizExt = await viewer.loadExtension("Autodesk.DataVisualization");
    viewer.addEventListener(Autodesk.DataVisualization.Core.MOUSE_CLICK, () => {
      console.log("onClickSelection");
    });
    const documentId = "urn:" + urn;
    Autodesk.Viewing.Document.load(
      documentId,
      onDocumentLoadSuccess,
      onDocumentLoadFailure
    );
  });

  function onDocumentLoadSuccess(doc) {
    // load the default view
    var viewables = doc.getRoot().getDefaultGeometry();
    viewer.loadDocumentNode(doc, viewables).then((model) => {
      // any additional action here?
      mainModel = model;
    });
  }

  function onDocumentLoadFailure(viewerErrorCode, viewerErrorMsg) {
    console.error(
      "onDocumentLoadFailure() - errorCode:" +
        viewerErrorCode +
        "\n- errorMessage:" +
        viewerErrorMsg
    );
  }
}

function getForgeToken(callback) {
  fetch("/api/forge/auth/token").then((res) => {
    res.json().then((data) => {
      callback(data.access_token, data.expires_in);
    });
  });
}
