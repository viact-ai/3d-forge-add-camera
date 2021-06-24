function onDragStart(event) {
  event.dataTransfer.effectAllowed = "copy";
  // Hide the dragged image
  var img = document.getElementById("blank");
  event.dataTransfer.setDragImage(img, 0, 0);
}

let mainModel = null;
let secondModel = null;
let extraZ = 0;

// Load camera model
const ModelState = {
  unloaded: 0,
  loading: 1,
  loaded: 2,
};
let modelState = ModelState.unloaded;

function onDragOver(event) {
  event.preventDefault();
  switch (modelState) {
    case ModelState.unloaded: {
      modelState = ModelState.loading;
      let documentId =
        "urn:" +
        "dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6dmlhY3QtbW9kZWxzL2NhbWVyYV93aGl0ZQ";

      Autodesk.Viewing.Document.load(documentId, (doc) => {
        let items = doc.getRoot().search(
          {
            type: "geometry",
            role: "3d",
          },
          true
        );
        if (items.length === 0) {
          console.error("Document contains no viewables.");
          return;
        }

        let tr = new THREE.Matrix4();
        tr.set(0, 0, 0.005, 0, 0.005, 0, 0, 0, 0, 0.005, 0, 0, 0, 0, 0, 1);
        viewer
          .loadDocumentNode(doc, items[0], {
            keepCurrentModels: true,
            placementTransform: tr,
          })
          .then(function (model2) {
            secondModel = model2;
            let bb = secondModel.getBoundingBox();
            extraZ = bb.max.z;
            modelState = ModelState.loaded;
          });
      });
      break;
    }

    case ModelState.loaded: {
      let res = viewer.impl.hitTest(event.clientX, event.clientY, true, null, [
        mainModel.getModelId(),
      ]);
      let pt = null;

      if (res) {
        pt = res.intersectPoint;
      } else {
        pt = viewer.impl.intersectGround(event.clientX, event.clientY);
      }

      let tr = secondModel.getPlacementTransform();
      tr.elements[12] = pt.x;
      tr.elements[13] = pt.y;
      tr.elements[14] = pt.z + extraZ;
      secondModel.setPlacementTransform(tr);
      viewer.impl.invalidate(true, true, true);

      break;
    }
  }
}

function onDrop(event) {
  event.preventDefault();
  modelState = ModelState.unloaded;
}
