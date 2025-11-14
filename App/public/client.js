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

const satTexture = makeCircleTexture();
const satMaterial = new THREE.PointsMaterial({
    color: 0xff0000,
    size: 0.05,
    map: satTexture,
    alphaTest: 0.5,
    transparent: true
});
//Sat Objects ---------------------------------------------------------------------
// Just call this to make a new satellite
function addSatellite(x, y, z) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([x, y, z], 3)
    );

    const sat = new THREE.Points(geometry, satMaterial);
    earth.add(sat);
    return sat;
}

// Add as many as you want
for (let i = 0; i < 3; i++) { 
        addSatellite(2, 0, i); // can switch out these xyz cords to the longitured, lattitude and altitude gotten from the api 
}
addSatellite(1.5, 1, .5);
addSatellite(-1.5, 1, 0.5);
addSatellite(0, -2, 1);

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
