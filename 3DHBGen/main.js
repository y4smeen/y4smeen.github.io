/**
 * main file of WebGL 3D Human Body Generator.
 *
 * @author  Zishun Liu
 * Modified by Yasmeen Roumie
 *
 */

if (!Detector.webgl) {
  Detector.addGetWebGLMessage();
}

("use strict"); // from the example of yagui. What's this?

var CONTAINER; // global as needed for window resize

// Render
var CAMERA, CONTROLS, SCENE, RENDERER;
var FOV = { min: 1, max: 90, init: 45 };

// GUI
var GUI_SLIDERS = [];
var GUI_FOV; // global as needed for mouse wheel
var GUI_BUTTON_FIX;
// Geometry
var MESH;
var MESHMATERIAL = new THREE.MeshLambertMaterial({
  color: 0x999999,
  side: THREE.DoubleSide,
});
var VERTEX_RESULT;
var MIN_Y; // determine the y position
var MEASURE_CURVES = new THREE.Group();
var MEASURE_CURVES_MATERIAL = new THREE.MeshLambertMaterial({
  color: 0x47538a,
});
var CLOTH_MESH;
var CLOTH_MESH_VISIBILITY = false;
var CLOTH_VERTEX;
var CLOTH_BIND;
var CLOTH_MATERIAL = new THREE.MeshLambertMaterial({
  color: 0xa35b5b, //0xa85454, //0xf3706c, //0xf3525c, // 0x515d99,
  side: THREE.DoubleSide,
});
var GenderEnum = { Female: 0, Male: 1 };
var GENDER;
// Body Parameters
var numParams = 8;
var arrayParamNames = [
  "Bust",
  "Under Bust",
  "Waist",
  "Hip",
  "Neck Girth",
  "Inside Leg",
  "Shoulder",
  "Body Height",
];
var arrayParamsMinMax = [
  [79.0, 70.0, 52.0, 79.0, 29.0, 65.0, 29.0, 145.0],
  [113.0, 101.0, 113.0, 121.0, 45.0, 95.0, 60.0, 201.0],
];
var arrayParamsDefaultF = [90.4, 80.6, 80.2, 98.3, 33.4, 76.3, 36.6, 168.0];
var arrayParamsDefaultM = [90.6, 86.7, 81.2, 95.2, 38.5, 77.1, 37.7, 174.0];
var arrayParams = arrayParamsDefaultF.slice(0); // slice for deep copy
var arrayParamFuncs = [
  setBust,
  setUnderBust,
  setWaist,
  setHip,
  setNeckGirth,
  setInsideLeg,
  setShoulder,
  setBodyHeight,
];

var SUSPEND_GENERATION = false;

initGUI();
initScene();
initCloth();
initBody();
initEvents();
animate();

function initGUI() {
  var viewport = document.getElementById("viewport");
  var main = new window.yagui.GuiMain(viewport, onWindowResize); // main gui

  // default values
  GENDER = GenderEnum.Female;

  var defaultBust = arrayParamsDefaultF[0];
  var defaultUnderBust = arrayParamsDefaultF[1];
  var defaultWaist = arrayParamsDefaultF[2];
  var defaultHips = arrayParamsDefaultF[3];
  var defaultNeckGirth = arrayParamsDefaultF[4];
  var defaultInsideLeg = arrayParamsDefaultF[5];
  var defaultShoulders = arrayParamsDefaultF[6];

  // Parse URL parameters to get body parameters
  const urlParams = new URLSearchParams(window.location.search);

  const genderParam = urlParams.get("gender");
  if (genderParam) {
    console.log("gender param", genderParam);
    const gender = genderParam.toLowerCase();
    if (gender === "male" || gender === "mens" || gender === "men") {
      GENDER = GenderEnum.Male;
      defaultBust = arrayParamsDefaultM[0];
      defaultUnderBust = arrayParamsDefaultM[1];
      defaultWaist = arrayParamsDefaultM[2];
      defaultHips = arrayParamsDefaultM[3];
      defaultNeckGirth = arrayParamsDefaultM[4];
      defaultInsideLeg = arrayParamsDefaultM[5];
      defaultShoulders = arrayParamsDefaultM[6];
    }
  }

  // height
  const height = urlParams.get("height");
  console.log("height param", height);
  if (height) {
    arrayParams[7] = height;
  }

  // weight
  const weight = urlParams.get("weight");
  console.log("weight param", weight);

  // Convert weight from pounds to kilograms
  const weightInPounds = parseFloat(weight);
  const weightInKg = weightInPounds * 0.453592; // 1 pound is approximately 0.453592 kilograms
  console.log("weight in kg", weightInKg);

  // Adjust height and weight multipliers based on gender
  const heightMultiplier = height / (GENDER === GenderEnum.Male ? 180 : 160); // Adjust for height based on gender
  const weightMultiplier = weightInKg / (GENDER === GenderEnum.Male ? 70 : 60); // Adjust for weight based on gender

  const shoulders = urlParams.get("shoulders");
  console.log("shoulders param", shoulders);

  // Adjust shoulder width based on height and gender
  switch (shoulders.toLowerCase()) {
    case "narrow":
      if (GENDER === GenderEnum.Male) {
        arrayParams[6] =
          defaultShoulders *
          0.9 *
          heightMultiplier *
          (1 - heightMultiplier * 0.1); // Adjust 180 based on average height and additional scaling for shorter individuals
      } else {
        arrayParams[6] =
          defaultShoulders *
          0.85 *
          heightMultiplier *
          (1 - heightMultiplier * 0.15); // Adjust 180 based on average height and additional scaling for shorter individuals
      }
      break;
    case "average":
      arrayParams[6] = defaultShoulders * heightMultiplier; // Adjust 180 based on average height
      break;
    case "wide":
      if (GENDER === GenderEnum.Male) {
        arrayParams[6] =
          defaultShoulders *
          1.1 *
          heightMultiplier *
          (1 + heightMultiplier * 0.1); // Adjust 180 based on average height and additional scaling for shorter individuals
      } else {
        arrayParams[6] =
          defaultShoulders *
          1.15 *
          heightMultiplier *
          (1 + heightMultiplier * 0.15); // Adjust 180 based on average height and additional scaling for shorter individuals
      }
  }

  // Adjust waist based on height and weight
  const waist = urlParams.get("waist");
  switch (waist.toLowerCase()) {
    case "narrow":
      arrayParams[2] = defaultWaist * 0.9 * heightMultiplier * weightMultiplier; // Adjust for weight
      break;
    case "average":
      arrayParams[2] = defaultWaist * heightMultiplier * weightMultiplier; // Adjust for weight
      break;
    case "wide":
      arrayParams[2] = defaultWaist * 1.1 * heightMultiplier * weightMultiplier; // Adjust for weight
  }

  // Adjust hips based on height and weight
  const hips = urlParams.get("hips");
  switch (hips.toLowerCase()) {
    case "narrow":
      arrayParams[3] = defaultHips * 0.9 * heightMultiplier * weightMultiplier; // Adjust for weight
      break;
    case "average":
      arrayParams[3] = defaultHips * heightMultiplier * weightMultiplier; // Adjust for weight
      break;
    case "wide":
      arrayParams[3] = defaultHips * 1.1 * heightMultiplier * weightMultiplier; // Adjust for weight
  }

  // Adjust bust based on height and weight
  arrayParams[0] = defaultBust * heightMultiplier * weightMultiplier; // Adjust for weight

  // Adjust under bust based on height and weight
  arrayParams[1] = defaultUnderBust * heightMultiplier * weightMultiplier; // Adjust for weight

  // Adjust neck girth based on height and weight
  arrayParams[4] = defaultNeckGirth * heightMultiplier * weightMultiplier; // Adjust for weight

  // Adjust inside leg based on height
  arrayParams[5] = defaultInsideLeg * heightMultiplier; // Adjust 180 based on average height
}

function initScene() {
  CONTAINER = document.getElementById("viewport");

  //////// Camera ////////

  CAMERA = new THREE.PerspectiveCamera(
    FOV.init,
    CONTAINER.offsetWidth / CONTAINER.offsetHeight,
    0.01,
    1000
  );

  // Set camera position to face the body face on more directly
  CAMERA.position.set(0, 0.8, 2.5); // first value is left/right, second is up/down, third is forward/backward

  // Set camera target to focus more directly on the body
  CAMERA.lookAt(new THREE.Vector3(0, 0.6, 0)); // Adjust the target based on your scene for a more direct focus
  //////// Scene ////////

  SCENE = new THREE.Scene();

  setLight();

  // Ground Plane / floor
  var groundPlaneMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    opacity: 0.5,
    transparent: true,
    wireframe: false,
    side: THREE.DoubleSide,
  });
  var x = 100;
  var y = 100;
  var plane = new THREE.Mesh(
    new THREE.PlaneGeometry(x, y, 1, 1),
    groundPlaneMaterial
  );
  plane.name = "plane";
  plane.receiveShadow = true;
  plane.rotation.x = -Math.PI / 2;
  SCENE.add(plane);

  SCENE.fog = new THREE.FogExp2(this.fogColor, 0.05);

  //////// Renderer ////////

  RENDERER = new THREE.WebGLRenderer({ antialias: true });
  RENDERER.setPixelRatio(window.devicePixelRatio);
  RENDERER.setSize(CONTAINER.offsetWidth, CONTAINER.offsetHeight);
  RENDERER.setClearColor(0xffffff);
  RENDERER.shadowMap.enabled = true;
  RENDERER.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

  CONTAINER.appendChild(RENDERER.domElement);

  //////// Controls ////////

  CONTROLS = new THREE.OrbitControls(CAMERA, RENDERER.domElement);
  CONTROLS.enableDamping = true;
  CONTROLS.dampingFactor = 0.25;
  CONTROLS.enableZoom = false; // change fov is better
  CONTROLS.target = new THREE.Vector3(0, 0.8, 0);
  CONTROLS.maxPolarAngle = Math.PI * 0.55;
}

function initCloth() {
  if (GENDER == GenderEnum.Female) {
    var geometry = new THREE.Geometry();
    var numV = DB_CLOTH_F["v"].length;
    geometry.vertices = new Array(numV);
    for (var i = 0; i < numV; ++i) {
      geometry.vertices[i] = new THREE.Vector3(
        DB_CLOTH_F["v"][i][0],
        DB_CLOTH_F["v"][i][1],
        DB_CLOTH_F["v"][i][2]
      );
    }

    CLOTH_VERTEX = DB_CLOTH_F["v"];

    CLOTH_BIND = DB_CLOTH_F["sp"];

    var numF = DB_CLOTH_F["f"].length;
    geometry.faces = new Array(numF);
    for (var i = 0; i < numF; ++i) {
      geometry.faces[i] = new THREE.Face3(
        DB_CLOTH_F["f"][i][0],
        DB_CLOTH_F["f"][i][1],
        DB_CLOTH_F["f"][i][2]
      );
    }
  } else {
    var geometry = new THREE.Geometry();
    var numV = DB_CLOTH_M["v"].length;
    geometry.vertices = new Array(numV);
    for (var i = 0; i < numV; ++i) {
      geometry.vertices[i] = new THREE.Vector3(
        DB_CLOTH_M["v"][i][0],
        DB_CLOTH_M["v"][i][1],
        DB_CLOTH_M["v"][i][2]
      );
    }

    CLOTH_VERTEX = DB_CLOTH_M["v"];

    CLOTH_BIND = DB_CLOTH_M["sp"];

    var numF = DB_CLOTH_M["f"].length;
    geometry.faces = new Array(numF);
    for (var i = 0; i < numF; ++i) {
      geometry.faces[i] = new THREE.Face3(
        DB_CLOTH_M["f"][i][0],
        DB_CLOTH_M["f"][i][1],
        DB_CLOTH_M["f"][i][2]
      );
    }
  }

  if (CLOTH_MESH) {
    SCENE.remove(CLOTH_MESH);
    CLOTH_MESH.geometry.dispose(); // see https://threejs.org/docs/#api/core/Geometry.dispose
  }
  CLOTH_MESH = new THREE.Mesh(geometry, CLOTH_MATERIAL);

  CLOTH_MESH.castShadow = true; //default is false
  SCENE.add(CLOTH_MESH);
  //CLOTH_MESH.visible = false;

  CLOTH_MESH.visible = CLOTH_MESH_VISIBILITY;
}

function setLight() {
  var ambient, keyLight, fillLight, backLight;

  ambient = new THREE.AmbientLight(0xffffff, 1.0);

  keyLight = new THREE.DirectionalLight(0xffffff, 0.3);
  keyLight.castShadow = true;
  keyLight.position.set(-50, 100, 100);

  fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
  fillLight.position.set(50, 10, 100);

  backLight = new THREE.DirectionalLight(0xffffff, 0.5);
  backLight.position.set(1, 1, -50);

  SCENE.add(ambient);
  SCENE.add(keyLight);
  SCENE.add(fillLight);
  SCENE.add(backLight);
}

function initBody() {
  // init a female model
  //   GENDER = GenderEnum.Female;

  MEASURE_CURVES.visible = false;

  setGender(GENDER);

  CLOTH_MESH.visible = false;
}

function constructMesh() {
  var geom = new THREE.Geometry();

  if (GENDER == GenderEnum.Female) {
    var numV = DBf["numV"];
    var numF = DBf["numF"];
    var f = DBf["F"];
  } else {
    var numV = DBm["numV"];
    var numF = DBm["numF"];
    var f = DBm["F"];
  }

  geom.vertices = new Array(numV);
  for (var i = 0; i < numV; ++i) geom.vertices[i] = new THREE.Vector3(0, 0, 0);

  geom.faces = new Array(numF);
  for (var i = 0; i < numF; ++i)
    geom.faces[i] = new THREE.Face3(f[i * 3], f[i * 3 + 1], f[i * 3 + 2]);

  // ? delete old one manually?
  if (MESH) {
    SCENE.remove(MESH);
    MESH.geometry.dispose(); // see https://threejs.org/docs/#api/core/Geometry.dispose
  }
  MESH = new THREE.Mesh(geom, MESHMATERIAL);
  //MESH.geometry.computeFaceNormals();
  MESH.geometry.computeVertexNormals();

  MESH.castShadow = true; //default is false
  SCENE.add(MESH);
}

function animate() {
  requestAnimationFrame(animate);

  CONTROLS.update();

  render();
}

function render() {
  RENDERER.render(SCENE, CAMERA);
}

function initEvents() {
  window.addEventListener("resize", onWindowResize, false);
  //window.addEventListener('keydown', onKeyboardEvent, false);
  window.addEventListener("mousewheel", onMouseWheel, false);
}

function onWindowResize() {
  CAMERA.aspect = CONTAINER.offsetWidth / CONTAINER.offsetHeight;
  CAMERA.updateProjectionMatrix();

  RENDERER.setSize(CONTAINER.offsetWidth, CONTAINER.offsetHeight);
}

function onMouseWheel() {
  var fov = CAMERA.fov - event.wheelDeltaY * 0.05;
  fov = Math.max(Math.min(fov, FOV.max), FOV.min);
  GUI_FOV.setValue(CAMERA.fov);
  setFOV(fov);
}

function setFOV(fov) {
  CAMERA.fov = fov;
  CAMERA.updateProjectionMatrix();
}

function exportObj() {
  var comments =
    "# Exported from WEBGL-HumanBodyGenerator. Academic use only\n";
  for (var i = 0; i < numParams; ++i) {
    comments += "# " + arrayParamNames[i] + ": " + arrayParams[i] + " cm\n";
  }

  var exporter = new THREE.OBJExporter();
  var result = comments + exporter.parse(MESH);
  //var result = comments + exporter.parse( CLOTH_MESH );
  var MIME_TYPE = "text/plain";

  //window.URL = window.webkitURL || window.URL;

  var bb = new Blob([result], { type: MIME_TYPE });

  var a = document.createElement("a");
  a.download = "3DHBGen_export.obj";
  a.href = window.URL.createObjectURL(bb);
  a.textContent = "Download ready";
  a.dataset.downloadurl = [MIME_TYPE, a.download, a.href].join(":");
  a.click();
}

function resetDefaultParams() {
  if (GENDER == GenderEnum.Female) {
    resetParams(arrayParamsDefaultF);
  } else {
    resetParams(arrayParamsDefaultM);
  }
}

function resetParams(p) {
  arrayParams = p.slice(0);
  generateBody();
  SUSPEND_GENERATION = true;
  for (var i = 0; i < numParams; ++i) {
    GUI_SLIDERS[i].setValue(arrayParams[i]);
  }
  SUSPEND_GENERATION = false;
}

function fixme() {
  var para = new Array(numParams - 1); // current param
  if (GENDER == GenderEnum.Female) {
    var cvxHull = DBf["cvxHull"];
  } else {
    var cvxHull = DBm["cvxHull"];
  }
  for (var i = 0; i < numParams - 1; ++i) {
    para[i] = arrayParams[i] / arrayParams[7];
  }

  // min_x 2*( 1/2 x^T x - p^T x )
  // s.t.: A^T x >= b0
  // Caution ! A^T is not A !
  var Dmat = [
    [1, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 0, 0, 1],
  ];

  var num_constraints = cvxHull.length;
  var Amat = new Array(7);
  var bvec = new Array(num_constraints);
  for (var i = 0; i < 7; ++i) {
    Amat[i] = new Array(num_constraints);
    for (var j = 0; j < num_constraints; ++j) {
      Amat[i][j] = -cvxHull[j][i];
    }
  }
  for (var j = 0; j < num_constraints; ++j) {
    bvec[j] = cvxHull[j][7]; //-1.e-3;
  }

  var res = numeric.solveQP(Dmat, para, Amat, bvec);
  var x0 = res.solution;

  var outside = checkConvexHull(cvxHull, x0, 2e-3);
  if (outside == true) {
    console.log("Fail to solve QP for input:");
    console.log(arrayParams);
    resetDefaultParams();
    return;
  }

  var para = new Array(numParams);
  para[numParams - 1] = arrayParams[numParams - 1];
  for (var i = 0; i < numParams - 1; ++i) {
    para[i] = arrayParams[numParams - 1] * x0[i];
  }

  resetParams(para);
}

// setGender: change the gender of the model
function setGender(value) {
  console.log("setGender", value);
  if (value == 0) GENDER = GenderEnum.Female;
  else GENDER = GenderEnum.Male;
  //resetParams();
  initCloth();
  constructMesh();
  generateBody();
}

// setBust: change the bust size
function setBust(value) {
  arrayParams[0] = value;
  generateBody();
}

// setUnderBust: change the under bust size
function setUnderBust(value) {
  arrayParams[1] = value;
  generateBody();
}

// setWaist: change the waist size
function setWaist(value) {
  arrayParams[2] = value;
  generateBody();
}

// setHip: change the hip size
function setHip(value) {
  arrayParams[3] = value;
  generateBody();
}

// setNeckGirth: change the neck girth size
function setNeckGirth(value) {
  arrayParams[4] = value;
  generateBody();
}

// setInsideLeg: change the inside leg length
function setInsideLeg(value) {
  arrayParams[5] = value;
  generateBody();
}

// setShoulder: change the shoulder width
function setShoulder(value) {
  arrayParams[6] = value;
  generateBody();
}

// setBodyHeight: change the body height
function setBodyHeight(value) {
  arrayParams[7] = value;
  generateBody();
}

// generateBodyWithParams: generate the body according to the parameters
// p[0] = bust, p[1] = under bust, p[2] = waist, p[3] = hip, p[4] = neck girth, p[5] = inside leg, p[6] = shoulder, p[7] = body height
function generateBodyWithParams() {
  arrayParams = [113, 70, 52, 79, 29, 65, 29, 145];
  generateBody();
}

// generateBody: generate the body according to the parameters
function generateBody() {
  if (SUSPEND_GENERATION == true) return;

  var timeStart = performance.now();

  if (GENDER == GenderEnum.Female) {
    var r = DBf["R"];
    var e = DBf["e"];
    var pc = DBf["pc"];
    var mA = DBf["mA"];
    var cvxHull = DBf["cvxHull"];
  } else {
    var r = DBm["R"];
    var e = DBm["e"];
    var pc = DBm["pc"];
    var mA = DBm["mA"];
    var cvxHull = DBm["cvxHull"];
  }
  var para = new Array(numParams - 1);
  for (var i = 0; i < numParams - 1; ++i)
    para[i] = arrayParams[i] / arrayParams[7];
  var Rl = numeric.dot(r, para);
  numeric.addeq(Rl, e);
  VERTEX_RESULT = numeric.dot(pc, Rl);
  numeric.addeq(VERTEX_RESULT, mA);
  VERTEX_RESULT = numeric.mul(VERTEX_RESULT, arrayParams[7] / 100.0);

  // make the model stand on the ground plane
  MIN_Y = 1000.0;
  for (var i = 0; i < MESH.geometry.vertices.length; ++i) {
    if (VERTEX_RESULT[3 * i + 1] < MIN_Y) {
      MIN_Y = VERTEX_RESULT[3 * i + 1];
    }
  }
  for (var i = 0; i < MESH.geometry.vertices.length; ++i) {
    MESH.geometry.vertices[i].x = VERTEX_RESULT[3 * i];
    MESH.geometry.vertices[i].y = VERTEX_RESULT[3 * i + 1] - MIN_Y;
    MESH.geometry.vertices[i].z = VERTEX_RESULT[3 * i + 2];
  }

  if (MEASURE_CURVES.visible == true) redrawCurves();

  MESH.geometry.verticesNeedUpdate = true;
  //MESH.geometry.computeFaceNormals();
  MESH.geometry.computeVertexNormals();
  MESH.geometry.normalsNeedUpdate = true;

  var timeEnd = performance.now();
  console.log(
    "Body generation ",
    Object.keys(GenderEnum)[GENDER],
    timeEnd - timeStart,
    " ms."
  );
  //console.log(strTime());

  var outside = checkConvexHull(cvxHull, para, 2e-3);
  //   GUI_BUTTON_FIX.setEnable(outside);
}

function checkConvexHull(cvxHull, para, tol) {
  // check convex hull
  var para8 = new Array(numParams);
  for (var i = 0; i < numParams - 1; ++i) para8[i] = para[i];
  para8[numParams - 1] = 1.0;
  var checkCH = numeric.dot(cvxHull, para8);
  var outside = false;
  for (var i = 0; i < cvxHull.length; ++i) {
    if (checkCH[i] > tol) {
      //console.log('Outside')
      outside = true;
      break;
    }
  }
  return outside;
}

function redrawCloth() {
  if (GENDER == GenderEnum.Male) {
    var mesh_disp = new Array(MESH.geometry.vertices.length);
    var h = arrayParams[7] / 100.0; // height
    for (var i = 0; i < MESH.geometry.vertices.length; ++i) {
      mesh_disp[i] = [
        VERTEX_RESULT[3 * i] - DB_CLOTH_M["v_body"][i][0] * h,
        VERTEX_RESULT[3 * i + 1] - DB_CLOTH_M["v_body"][i][1] * h,
        VERTEX_RESULT[3 * i + 2] - DB_CLOTH_M["v_body"][i][2] * h,
      ];
    }
    var timeSP1 = performance.now();
    var cloth_disp = numeric.ccsDot(CLOTH_BIND, numeric.ccsSparse(mesh_disp));
    var timeSP2 = performance.now();
    console.log("cloth ", timeSP2 - timeSP1, " ms.");
    cloth_disp = numeric.ccsFull(cloth_disp);
    for (var i = 0; i < CLOTH_MESH.geometry.vertices.length; ++i) {
      CLOTH_MESH.geometry.vertices[i].x =
        CLOTH_VERTEX[i][0] * h + cloth_disp[i][0];
      CLOTH_MESH.geometry.vertices[i].y =
        CLOTH_VERTEX[i][1] * h + cloth_disp[i][1] - MIN_Y;
      CLOTH_MESH.geometry.vertices[i].z =
        CLOTH_VERTEX[i][2] * h + cloth_disp[i][2];
    }
  } else {
    // todo: make mesh_disp ccsSparse
    var mesh_disp = new Array(MESH.geometry.vertices.length);
    var h = arrayParams[7] / 100.0; // height
    for (var i = 0; i < MESH.geometry.vertices.length; ++i) {
      mesh_disp[i] = [
        VERTEX_RESULT[3 * i] - DB_CLOTH_F["v_body"][i][0] * h,
        VERTEX_RESULT[3 * i + 1] - DB_CLOTH_F["v_body"][i][1] * h,
        VERTEX_RESULT[3 * i + 2] - DB_CLOTH_F["v_body"][i][2] * h,
      ];
    }
    var timeSP1 = performance.now();
    var cloth_disp = numeric.ccsDot(CLOTH_BIND, numeric.ccsSparse(mesh_disp));
    var timeSP2 = performance.now();
    console.log("cloth ", timeSP2 - timeSP1, " ms.");
    cloth_disp = numeric.ccsFull(cloth_disp);
    for (var i = 0; i < CLOTH_MESH.geometry.vertices.length; ++i) {
      CLOTH_MESH.geometry.vertices[i].x =
        CLOTH_VERTEX[i][0] * h + cloth_disp[i][0];
      CLOTH_MESH.geometry.vertices[i].y =
        CLOTH_VERTEX[i][1] * h + cloth_disp[i][1] - MIN_Y;
      CLOTH_MESH.geometry.vertices[i].z =
        CLOTH_VERTEX[i][2] * h + cloth_disp[i][2];
    }
  }
  CLOTH_MESH.geometry.verticesNeedUpdate = true;
  CLOTH_MESH.geometry.computeVertexNormals();
  CLOTH_MESH.geometry.normalsNeedUpdate = true;
}

// todo: PCA first, then convex hull
function redrawCurves() {
  // build-in curve
  var r = 0.005;
  for (var i = MEASURE_CURVES.children.length - 1; i >= 0; i--) {
    MEASURE_CURVES.remove(MEASURE_CURVES.children[i]);
  }

  if (GENDER == GenderEnum.Female) {
    var edgeNodes = DBf["edgeNodes"];
    var edgeRatios = DBf["edgeRatios"];
    var fpt = DBf["fpt"];
  } else {
    var edgeNodes = DBm["edgeNodes"];
    var edgeRatios = DBm["edgeRatios"];
    var fpt = DBm["fpt"];
  }
  for (var i = 0; i < edgeRatios.length; ++i) {
    var group = new THREE.Group();
    var skip = 4;
    var nodes = new Array(Math.floor(edgeRatios[i].length / (1 + skip)));
    var count = 0;
    for (var j = 0; j < edgeRatios[i].length; j += 1 + skip, count++) {
      // skip some
      var ratio = edgeRatios[i][j];
      var sIdx = edgeNodes[i][2 * j];
      var lIdx = edgeNodes[i][2 * j + 1];
      var spos = MESH.geometry.vertices[sIdx];
      var lpos = MESH.geometry.vertices[lIdx];
      spos.multiplyScalar(1.0 - ratio);
      spos.addScaledVector(lpos, ratio);
      nodes[count] = spos.clone();
    }
    var curve = new THREE.CatmullRomCurve3(nodes, true); // centripetal, chordal and catmullrom.
    var geometry = new THREE.TubeGeometry(curve, 50, r, 8, true);
    var mesh = new THREE.Mesh(geometry, MEASURE_CURVES_MATERIAL);
    group.add(mesh);
    MEASURE_CURVES.add(group);
  }

  var group = new THREE.Group();
  var geometry = new THREE.Geometry();
  for (var j = 0; j < fpt.length; ++j) {
    var idx = fpt[j];
    var pos = MESH.geometry.vertices[idx];
    var geometry = new THREE.SphereGeometry(0.008, 8, 8);
    var sphere = new THREE.Mesh(geometry, MEASURE_CURVES_MATERIAL);
    sphere.position.set(pos.x, pos.y, pos.z);
    group.add(sphere);
  }
  MEASURE_CURVES.add(group);

  SCENE.add(MEASURE_CURVES);
  RENDERER.render(SCENE, CAMERA);
}

function addZero(x, n) {
  while (x.toString().length < n) {
    x = "0" + x;
  }
  return x;
}
