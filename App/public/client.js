import * as THREE from 'three'
import { OrbitControls } from './jsm/controls/OrbitControls.js'
import Stats from './jsm/libs/stats.module.js'
import { GUI } from './jsm/libs/lil-gui.module.min.js'

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.z = 5 // changes camera distance

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)

//Earth Object ---------------------------------------------------------------------
const earthGeometry = new THREE.SphereGeometry()
const earthMaterial = new THREE.MeshBasicMaterial({
    color: 0x0070f0,
    wireframe: true,
})
const earth = new THREE.Mesh(earthGeometry, earthMaterial)
scene.add(earth)

function makeCircleTexture(size = 64) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
}


//Sat Objects ---------------------------------------------------------------------
 function latLonToVector3(lat, lon, radius = 0.5) {
    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon + 180);

    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const z =  radius * Math.sin(phi) * Math.sin(theta);
    const y =  radius * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
}

// Just call this to make a new satellite
function addSatellite(x, y, z,color) {
    const geometry = new THREE.BufferGeometry();
    const altitude = 0.1; // small distance above the sphere
    const cordanates = latLonToVector3(x, y, z, 1);
    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([cordanates.x, cordanates.y, cordanates.z], 3)
    );

    const satTexture = makeCircleTexture();
    const satMaterial = new THREE.PointsMaterial({
        color: color,
        size: 0.03,
        map: satTexture,
        alphaTest: 0.5,
        transparent: true
    });


    const sat = new THREE.Points(geometry, satMaterial);
    earth.add(sat);
    return sat;
}

// Add as many as you want
  for (let i = 0; i < 360; i++) { 
          addSatellite(0, i , 1); // equator test in white
  }

//N W cordinates stay the same S E cordinates are negative
for (let i = 40; i < 100; i++) { 
          addSatellite(45.6793, 111.0373, i/40, 0x39FF14); //Bozeman in green
  }


addSatellite(39.7392, 104.9903, 1, 0x39FF14); //Denver in green
addSatellite(51.5072, 0.1276, 1, 0xFFFF00); //london in yellow
addSatellite(-33.8727, -151.2057, 1, 0xFFA500); //sydney in orange


//utilites Objects ---------------------------------------------------------------------
window.addEventListener(
    'resize',
    function () {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
        render()
    },
    false
)

const stats = Stats()
document.body.appendChild(stats.dom)

const gui = new GUI()
const cameraFolder = gui.addFolder('Camera')
cameraFolder.add(camera.position, 'z', 0, 10)
cameraFolder.open()

function animate() {
    requestAnimationFrame(animate)
    earth.rotation.x += 0.00
    earth.rotation.y += 0.001
    controls.update()
    render()
    stats.update()
}

function render() {
    renderer.render(scene, camera)
}

animate()
