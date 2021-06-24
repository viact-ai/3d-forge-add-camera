var viewer;

// @urn the model to show
// @viewablesId which viewables to show, applies to BIM 360 Plans folder
function launchViewer(urn) {
  var options = {
    env: "AutodeskProduction",
    getAccessToken: getForgeToken,
    api:
      "derivativeV2" +
      (atob(urn.replace("_", "/")).indexOf("emea") > -1 ? "_EU" : ""), // handle BIM 360 US and EU regions
  };

  Autodesk.Viewing.Initializer(options, () => {
    viewer = new Autodesk.Viewing.GuiViewer3D(
      document.getElementById("forgeViewer"),
      { extensions: ["Autodesk.DocumentBrowser"] }
    );
    viewer.start();
    var documentId = "urn:" + urn;
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
