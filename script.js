// Three JS Lab City 3D - Scene Engine

// Global variables & state
var currentAnimMode = 'breathing'; // 'static', 'breathing', 'elastic'
var activeTheme = 'pink';

var bubble;
var bubbleMaterial;
var bubbleNoiseTexture;

var themes = {
  pink: {
    hex: '#F02050',
    rgb: '240, 32, 80',
    colorVal: 0xF02050
  },
  yellow: {
    hex: '#F2F111',
    rgb: '242, 241, 17',
    colorVal: 0xF2F111
  },
  blue: {
    hex: '#38bdf8',
    rgb: '56, 189, 248',
    colorVal: 0x1a1f3c
  },
  orange: {
    hex: '#FF6347',
    rgb: '255, 99, 71',
    colorVal: 0xFF6347
  }
};

//----------------------------------------------------------------- BASIC parameters
var renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

if (window.innerWidth > 800) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.needsUpdate = true;
}

// Append to dedicated container
var container = document.getElementById('canvas-container');
if (container) {
  container.appendChild( renderer.domElement );
} else {
  document.body.appendChild( renderer.domElement );
}

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

var camera = new THREE.PerspectiveCamera( 20, window.innerWidth / window.innerHeight, 1, 500 );
camera.position.set(0, 2, 14);

var scene = new THREE.Scene();
var city = new THREE.Object3D();
var smoke = new THREE.Object3D();
var town = new THREE.Object3D();

var createCarPos = true;
var uSpeed = 0.001;

// Set initial color
var setcolor = themes[activeTheme].colorVal;
scene.background = new THREE.Color(setcolor);
scene.fog = new THREE.Fog(setcolor, 10, 16);

//----------------------------------------------------------------- RANDOM Function
function mathRandom(num = 8) {
  var numValue = - Math.random() * num + Math.random() * num;
  return numValue;
}

// Procedural normal map texture generator for refractive distortion noise
function createNoiseNormalTexture() {
  var size = 256;
  var canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  var ctx = canvas.getContext('2d');
  var imgData = ctx.createImageData(size, size);
  
  var heights = new Float32Array(size * size);
  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      var val = 0;
      var scale = 0.04;
      val += Math.sin(x * scale) * Math.cos(y * scale) * 1.0;
      val += Math.sin(x * scale * 2.3 + 1.5) * Math.sin(y * scale * 1.7 + 2.3) * 0.5;
      val += Math.cos(x * scale * 4.1 + 0.7) * Math.cos(y * scale * 5.3 + 1.2) * 0.25;
      heights[y * size + x] = val;
    }
  }
  
  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      var xLeft = heights[y * size + ((x - 1 + size) % size)];
      var xRight = heights[y * size + ((x + 1) % size)];
      var yUp = heights[((y - 1 + size) % size) * size + x];
      var yDown = heights[((y + 1) % size) * size + x];
      
      var dx = (xRight - xLeft) * 1.5;
      var dy = (yDown - yUp) * 1.5;
      var dz = 1.0;
      
      var len = Math.sqrt(dx*dx + dy*dy + dz*dz);
      dx /= len;
      dy /= len;
      dz /= len;
      
      var r = Math.floor((dx * 0.5 + 0.5) * 255);
      var g = Math.floor((dy * 0.5 + 0.5) * 255);
      var b = Math.floor((dz * 0.5 + 0.5) * 255);
      
      var idx = (y * size + x) * 4;
      imgData.data[idx] = r;
      imgData.data[idx+1] = g;
      imgData.data[idx+2] = b;
      imgData.data[idx+3] = 255;
    }
  }
  
  ctx.putImageData(imgData, 0, 0);
  
  var texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 1.5);
  return texture;
}

//----------------------------------------------------------------- CREATE City
function init() {
  var segments = 2;
  for (var i = 1; i<100; i++) {
    // Fixed: changed CubeGeometry(1,0,0) to BoxGeometry(1,1,1)
    var geometry = new THREE.BoxGeometry(1, 1, 1, segments, segments, segments);
    
    var material = new THREE.MeshStandardMaterial({
      color: 0x000000,
      wireframe: false,
      flatShading: false,
      side: THREE.DoubleSide
    });
    
    var wmaterial = new THREE.MeshLambertMaterial({
      color: 0xFFFFFF,
      wireframe: true,
      transparent: true,
      opacity: 0.03,
      side: THREE.DoubleSide
    });

    var cube = new THREE.Mesh(geometry, material);
    var wire = new THREE.Mesh(geometry, wmaterial);
    var floor = new THREE.Mesh(geometry, material);
    
    cube.add(wire);
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.rotationValue = 0.1 + Math.abs(mathRandom(8));
    
    floor.scale.y = 0.05;
    cube.scale.y = 0.1 + Math.abs(mathRandom(8));
    
    var cubeWidth = 0.9;
    cube.scale.x = cube.scale.z = cubeWidth + mathRandom(1 - cubeWidth);
    cube.position.x = Math.round(mathRandom());
    cube.position.z = Math.round(mathRandom());
    
    floor.position.set(cube.position.x, 0, cube.position.z);
    
    town.add(floor);
    town.add(cube);
  }
  
  //----------------------------------------------------------------- Particular (Smoke)
  var gmaterial = new THREE.MeshToonMaterial({color:0xFFFF00, side:THREE.DoubleSide});
  var gparticular = new THREE.CircleGeometry(0.01, 3);
  var aparticular = 5;
  
  for (var h = 1; h<300; h++) {
    var particular = new THREE.Mesh(gparticular, gmaterial);
    particular.position.set(mathRandom(aparticular), mathRandom(aparticular), mathRandom(aparticular));
    particular.rotation.set(mathRandom(), mathRandom(), mathRandom());
    smoke.add(particular);
  }
  
  var pmaterial = new THREE.MeshPhongMaterial({
    color: 0x000000,
    side: THREE.DoubleSide,
    opacity: 0.9,
    transparent: true
  });
  
  var pgeometry = new THREE.PlaneGeometry(60,60);
  var pelement = new THREE.Mesh(pgeometry, pmaterial);
  pelement.rotation.x = -90 * Math.PI / 180;
  pelement.position.y = -0.001;
  pelement.receiveShadow = true;

  city.add(pelement);
  
  //----------------------------------------------------------------- Glass Sphere Dome
  bubbleNoiseTexture = createNoiseNormalTexture();
  
  bubbleMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.22,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.9,     // Refraction through the glass
    ior: 1.25,             // Index of Refraction
    thickness: 1.5,        // Refraction depth
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    normalMap: bubbleNoiseTexture,
    normalScale: new THREE.Vector2(0.2, 0.2), // strength of normal distortion
    depthWrite: false,     // prevent depth clipping bugs
    side: THREE.DoubleSide
  });

  // Initial emissive color based on theme
  var initEmissive = new THREE.Color(0x300510); // pink
  if (activeTheme === 'yellow') initEmissive.setHex(0x202002);
  else if (activeTheme === 'blue') initEmissive.setHex(0x052030);
  else if (activeTheme === 'orange') initEmissive.setHex(0x301005);
  bubbleMaterial.emissive = initEmissive;

  // Vertex shader displacement via onBeforeCompile
  bubbleMaterial.onBeforeCompile = function(shader) {
    shader.uniforms.uTime = { value: 0 };
    
    shader.vertexShader = `
      uniform float uTime;
      float getDisplacement(vec3 p, float time) {
        float d = sin(p.x * 1.2 + time) * cos(p.y * 1.2 + time) * 0.15;
        d += sin(p.z * 2.5 - time * 1.5) * cos(p.x * 2.5 + time * 0.8) * 0.08;
        return d;
      }
    ` + shader.vertexShader;
    
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      float disp = getDisplacement(position, uTime);
      transformed += normal * disp;
      `
    );
    
    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      `
      #include <beginnormal_vertex>
      float disp = getDisplacement(position, uTime);
      float dispDeltaX = getDisplacement(position + vec3(0.01, 0.0, 0.0), uTime) - disp;
      float dispDeltaY = getDisplacement(position + vec3(0.0, 0.01, 0.0), uTime) - disp;
      objectNormal.x -= dispDeltaX * 12.0;
      objectNormal.y -= dispDeltaY * 12.0;
      objectNormal = normalize(objectNormal);
      `
    );
    
    bubbleMaterial.userData.shader = shader;
  };

  var bubbleGeometry = new THREE.SphereGeometry(10, 64, 64);
  bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
  bubble.position.set(0, 1, 0); // raised dome enclosing the city
  
  var toggleEl = document.getElementById('toggle-bubble');
  if (toggleEl) {
    bubble.visible = toggleEl.checked;
  }
  
  city.add(bubble);
  
  // Set initial animation state
  if (currentAnimMode === 'elastic') {
    switchAnimationMode('elastic');
  }
}

//----------------------------------------------------------------- MOUSE function
var mouse = new THREE.Vector2();

function onMouseMove(event) {
  event.preventDefault();
  // Compute mouse positions normalized
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onDocumentTouchStart( event ) {
  if ( event.touches.length == 1 ) {
    event.preventDefault();
    mouse.x = (event.touches[ 0 ].pageX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.touches[ 0 ].pageY / window.innerHeight) * 2 + 1;
  }
}

function onDocumentTouchMove( event ) {
  if ( event.touches.length == 1 ) {
    event.preventDefault();
    mouse.x = (event.touches[ 0 ].pageX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.touches[ 0 ].pageY / window.innerHeight) * 2 + 1;
  }
}

window.addEventListener('mousemove', onMouseMove, false);
window.addEventListener('touchstart', onDocumentTouchStart, false );
window.addEventListener('touchmove', onDocumentTouchMove, false );

//----------------------------------------------------------------- Lights
var ambientLight = new THREE.AmbientLight(0xFFFFFF, 4);
var lightFront = new THREE.SpotLight(0xFFFFFF, 20, 10);
var lightBack = new THREE.PointLight(0xFFFFFF, 0.5);

lightFront.rotation.x = 45 * Math.PI / 180;
lightFront.rotation.z = -45 * Math.PI / 180;
lightFront.position.set(5, 5, 5);
lightFront.castShadow = true;
lightFront.shadow.mapSize.width = 6000;
lightFront.shadow.mapSize.height = lightFront.shadow.mapSize.width;
lightFront.penumbra = 0.1;
lightBack.position.set(0,6,0);

smoke.position.y = 2;

scene.add(ambientLight);
city.add(lightFront);
scene.add(lightBack);
scene.add(city);
city.add(smoke);
city.add(town);

//----------------------------------------------------------------- GRID Helper
var gridHelper = new THREE.GridHelper( 60, 120, 0xFF0000, 0x000000);
city.add( gridHelper );

//----------------------------------------------------------------- CAR world / Lines
var createCars = function(cScale = 2, cPos = 20, cColor = 0xFFFF00) {
  var cMat = new THREE.MeshToonMaterial({color:cColor, side:THREE.DoubleSide});
  var cGeo = new THREE.BoxGeometry(1, cScale/40, cScale/40);
  var cElem = new THREE.Mesh(cGeo, cMat);
  var cAmp = 3;
  
  if (createCarPos) {
    createCarPos = false;
    cElem.position.x = -cPos;
    cElem.position.z = (mathRandom(cAmp));

    gsap.to(cElem.position, {
      x: cPos, 
      duration: 3, 
      repeat: -1, 
      yoyo: true, 
      delay: Math.abs(mathRandom(3)),
      ease: "power1.inOut"
    });
  } else {
    createCarPos = true;
    cElem.position.x = (mathRandom(cAmp));
    cElem.position.z = -cPos;
    cElem.rotation.y = 90 * Math.PI / 180;
  
    gsap.to(cElem.position, {
      z: cPos, 
      duration: 5, 
      repeat: -1, 
      yoyo: true, 
      delay: Math.abs(mathRandom(3)), 
      ease: "power1.inOut"
    });
  }
  
  cElem.receiveShadow = true;
  cElem.castShadow = true;
  cElem.position.y = Math.abs(mathRandom(5));
  city.add(cElem);
};

var generateLines = function() {
  for (var i = 0; i<60; i++) {
    createCars(0.1, 20);
  }
};

var cameraSet = function() {
  createCars(0.1, 20, 0xFFFFFF);
};

//----------------------------------------------------------------- ANIMATE Loop
var animate = function() {
  var time = Date.now() * 0.0005;
  requestAnimationFrame(animate);
  
  // Rotate city on mouse movement
  city.rotation.y -= ((mouse.x * 8) - city.rotation.y) * uSpeed;
  city.rotation.x -= (-(mouse.y * 2) - city.rotation.x) * uSpeed;
  
  if (city.rotation.x < -0.05) city.rotation.x = -0.05;
  else if (city.rotation.x > 1) city.rotation.x = 1;
  
  // Render loop animation based on mode
  if (currentAnimMode === 'breathing') {
    for ( let i = 0, l = town.children.length; i < l; i ++ ) {
      var object = town.children[ i ];
      if (object.rotationValue !== undefined) {
        var scaleY = Math.abs(Math.sin(time + i * 0.1)) * object.rotationValue + 0.1;
        object.scale.y = scaleY;
        object.position.y = scaleY / 2; // Anchored on ground
      }
    }
  }
  
  // Animate dynamic refraction noise coordinate offset
  if (bubbleNoiseTexture) {
    bubbleNoiseTexture.offset.x = time * 0.03;
    bubbleNoiseTexture.offset.y = time * 0.015;
  }
  
  // Update custom shader time uniform for vertex wobbles
  if (bubbleMaterial && bubbleMaterial.userData.shader) {
    bubbleMaterial.userData.shader.uniforms.uTime.value = time * 1.5;
  }
  
  smoke.rotation.y += 0.005;
  smoke.rotation.x += 0.002;
  
  camera.lookAt(city.position);
  renderer.render( scene, camera );  
}

//----------------------------------------------------------------- CONTROL FUNCTIONS
function switchTheme(themeName) {
  var theme = themes[themeName];
  if (!theme) return;
  
  activeTheme = themeName;
  
  // Update CSS Variables
  document.documentElement.style.setProperty('--theme-color', theme.hex);
  document.documentElement.style.setProperty('--theme-color-rgb', theme.rgb);
  
  // Animate fog & background transition
  var targetColor = new THREE.Color(theme.colorVal);
  gsap.to(scene.background, {
    r: targetColor.r,
    g: targetColor.g,
    b: targetColor.b,
    duration: 0.8
  });
  
  if (scene.fog) {
    gsap.to(scene.fog.color, {
      r: targetColor.r,
      g: targetColor.g,
      b: targetColor.b,
      duration: 0.8
    });
  }

  // Dynamic transition for the glass sphere emissive glow color
  if (bubble && bubble.material) {
    var emissiveColor;
    if (themeName === 'pink') emissiveColor = new THREE.Color(0x300510);
    else if (themeName === 'yellow') emissiveColor = new THREE.Color(0x202002);
    else if (themeName === 'blue') emissiveColor = new THREE.Color(0x052030);
    else if (themeName === 'orange') emissiveColor = new THREE.Color(0x301005);
    
    gsap.to(bubble.material.emissive, {
      r: emissiveColor.r,
      g: emissiveColor.g,
      b: emissiveColor.b,
      duration: 0.8
    });
  }

  // Update spotLight helper or grids
  if (themeName === 'yellow') {
    gridHelper.material.color.setHex(0xFFFF00);
  } else if (themeName === 'blue') {
    gridHelper.material.color.setHex(0x00D2FF);
  } else if (themeName === 'orange') {
    gridHelper.material.color.setHex(0xFF4500);
  } else {
    gridHelper.material.color.setHex(0xFF0000);
  }
  
  // UI active buttons styling
  document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
  var activeBtn = document.getElementById('theme-' + themeName);
  if (activeBtn) activeBtn.classList.add('active');
}

function switchAnimationMode(mode) {
  currentAnimMode = mode;
  
  // Clean up any running GSAP animations on buildings
  town.children.forEach(function(object) {
    if (object.rotationValue !== undefined) {
      gsap.killTweensOf(object.scale);
      gsap.killTweensOf(object.position);
    }
  });
  
  if (mode === 'elastic') {
    town.children.forEach(function(object, i) {
      if (object.rotationValue !== undefined) {
        var finalScale = object.rotationValue + 0.1;
        
        // Stagger entrance/bounce effect
        object.scale.y = 0.05;
        object.position.y = 0.025;
        
        gsap.to(object.scale, {
          y: finalScale,
          duration: 3,
          ease: "elastic.out(1, 0.4)",
          delay: (i * 0.015) % 2,
          repeat: -1,
          yoyo: true
        });
        
        gsap.to(object.position, {
          y: finalScale / 2,
          duration: 3,
          ease: "elastic.out(1, 0.4)",
          delay: (i * 0.015) % 2,
          repeat: -1,
          yoyo: true
        });
      }
    });
  } else if (mode === 'static') {
    town.children.forEach(function(object) {
      if (object.rotationValue !== undefined) {
        gsap.to(object.scale, {
          y: object.rotationValue,
          duration: 0.5,
          ease: "power2.out"
        });
        gsap.to(object.position, {
          y: object.rotationValue / 2,
          duration: 0.5,
          ease: "power2.out"
        });
      }
    });
  }
  
  // UI Button Active Styling
  document.querySelectorAll('.anim-mode-btn').forEach(btn => btn.classList.remove('active'));
  var activeBtn = document.getElementById('anim-' + mode);
  if (activeBtn) activeBtn.classList.add('active');
}

function randomizeCity() {
  var loader = document.getElementById('loader');
  if (loader) loader.classList.remove('fade-out');
  
  setTimeout(() => {
    // Clear and dispose old meshes
    while(town.children.length > 0) { 
      var obj = town.children[0];
      town.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }
    
    // Generate new city layout
    var segments = 2;
    for (var i = 1; i<100; i++) {
      var geometry = new THREE.BoxGeometry(1, 1, 1, segments, segments, segments);
      
      var material = new THREE.MeshStandardMaterial({
        color: 0x000000,
        wireframe: false,
        flatShading: false,
        side: THREE.DoubleSide
      });
      
      var wmaterial = new THREE.MeshLambertMaterial({
        color: 0xFFFFFF,
        wireframe: true,
        transparent: true,
        opacity: 0.03,
        side: THREE.DoubleSide
      });

      var cube = new THREE.Mesh(geometry, material);
      var wire = new THREE.Mesh(geometry, wmaterial);
      var floor = new THREE.Mesh(geometry, material);
      
      cube.add(wire);
      cube.castShadow = true;
      cube.receiveShadow = true;
      cube.rotationValue = 0.1 + Math.abs(mathRandom(8));
      
      floor.scale.y = 0.05;
      cube.scale.y = 0.1 + Math.abs(mathRandom(8));
      
      var cubeWidth = 0.9;
      cube.scale.x = cube.scale.z = cubeWidth + mathRandom(1 - cubeWidth);
      cube.position.x = Math.round(mathRandom());
      cube.position.z = Math.round(mathRandom());
      
      floor.position.set(cube.position.x, 0, cube.position.z);
      
      town.add(floor);
      town.add(cube);
    }
    
    // Reapply animation mode rules
    if (currentAnimMode === 'elastic') {
      switchAnimationMode('elastic');
    } else if (currentAnimMode === 'static') {
      switchAnimationMode('static');
    }
    
    // Dismiss loading screen
    setTimeout(() => {
      if (loader) loader.classList.add('fade-out');
    }, 450);
  }, 400);
}

//----------------------------------------------------------------- WIRE EVENTS TO UI
document.addEventListener('DOMContentLoaded', function() {
  
  // Theme Switching
  document.getElementById('theme-pink').addEventListener('click', () => switchTheme('pink'));
  document.getElementById('theme-yellow').addEventListener('click', () => switchTheme('yellow'));
  document.getElementById('theme-blue').addEventListener('click', () => switchTheme('blue'));
  document.getElementById('theme-orange').addEventListener('click', () => switchTheme('orange'));
  
  // Animation Switching
  document.getElementById('anim-static').addEventListener('click', () => switchAnimationMode('static'));
  document.getElementById('anim-breathing').addEventListener('click', () => switchAnimationMode('breathing'));
  document.getElementById('anim-elastic').addEventListener('click', () => switchAnimationMode('elastic'));
  
  // Toggles
  document.getElementById('toggle-grid').addEventListener('change', function(e) {
    gridHelper.visible = e.target.checked;
  });
  
  document.getElementById('toggle-smoke').addEventListener('change', function(e) {
    smoke.visible = e.target.checked;
  });
  
  document.getElementById('toggle-fog').addEventListener('change', function(e) {
    if (e.target.checked) {
      scene.fog = new THREE.Fog(themes[activeTheme].colorVal, 10, 16);
    } else {
      scene.fog = null;
    }
  });
  
  document.getElementById('toggle-bubble').addEventListener('change', function(e) {
    if (bubble) {
      bubble.visible = e.target.checked;
    }
  });
  
  // Actions
  document.getElementById('action-add-line').addEventListener('click', cameraSet);
  document.getElementById('action-randomize').addEventListener('click', randomizeCity);
  
  document.getElementById('action-reset-camera').addEventListener('click', function() {
    gsap.to(camera.position, {
      x: 0,
      y: 2,
      z: 14,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => camera.lookAt(city.position)
    });
    gsap.to(city.rotation, {
      x: 0,
      y: 0,
      z: 0,
      duration: 1.5,
      ease: "power2.inOut"
    });
  });
  
  // Fade out loader on window load (failsafe in case DomContentLoaded triggers fast)
  setTimeout(function() {
    var loader = document.getElementById('loader');
    if (loader) loader.classList.add('fade-out');
  }, 1000);
});

//----------------------------------------------------------------- START functions
generateLines();
init();
animate();