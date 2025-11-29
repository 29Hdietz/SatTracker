import * as THREE from 'three'
import { OrbitControls } from './jsm/controls/OrbitControls.js'
import Stats from './jsm/libs/stats.module.js'
import { GUI } from './jsm/libs/lil-gui.module.min.js'

let ACTIVE_SATELLITES = []
const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.z = 2.5 // changes camera starting distance

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)

//Earth Object ---------------------------------------------------------------------
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load('textures/00_earthmap1k.jpg');

const earthGeometry = new THREE.SphereGeometry(1, 64, 64)
const earthMaterial = new THREE.MeshPhongMaterial({
    map: earthTexture
})

const earth = new THREE.Mesh(earthGeometry, earthMaterial)
earth.rotation.y = Math.PI;
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

// Light Source ---------------------------------------------------------------------
const light = new THREE.AmbientLight(0xffffff, 1)
scene.add(light)

//Sat Objects ---------------------------------------------------------------------
 function latLonToVector3(lat, lon, radius = 1) {
    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon) * (-1);

    const x =  radius * Math.sin(phi) * Math.cos(theta);
    const z =  radius * Math.sin(phi) * Math.sin(theta);
    const y =  radius * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
}

// Just call this to make a new satellite
const sharedSatTexture = makeCircleTexture();

function addSatellite(lat, lon, radius, elavation, color = 0xFFFFFF) {
    const geometry = new THREE.BufferGeometry();
    const altitude = elavation; // small distance above the sphere
    const cordanates = latLonToVector3(lat, lon, radius + altitude);
    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([cordanates.x, cordanates.y, cordanates.z], 3)
    );

    const satMaterial = new THREE.PointsMaterial({
        color: color,
        size: 0.03,
        map: sharedSatTexture,
        alphaTest: 0.5,
        transparent: true
    });
    
    const sat = new THREE.Points(geometry, satMaterial);
    ACTIVE_SATELLITES.push(sat);
    earth.add(sat);
    return sat;
}

function removeAllSatellites() {
    for (const sat of ACTIVE_SATELLITES) {
        earth.remove(sat)
    }
    ACTIVE_SATELLITES = []
}

//N E cordinates positive S W cordinates are negative
addSatellite(45.6793, -111.0373, 1, 0, 0xFF0000);    // Bozeman 
addSatellite(39.7392, -104.9903, 1, 0, 0xFF0000);    // Denver 
addSatellite(51.5072, -0.1276, 1, 0, 0xFF0000);      // London
addSatellite(-33.8727, 151.2057, 1, 0, 0xFF0000);    // Sydney 


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

stats.dom.style.left = 'auto';
stats.dom.style.right = (gui.domElement.offsetWidth + 15) + 'px';

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

// fetch satellite data
async function fetchSatelliteData(satellites) { 
    try{
        if (satellites.length === 0) return
        removeAllSatellites();

        const response = await fetch('http://127.0.0.1:3000/satellites', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({  satellites: satellites })
        });
        const data = await response.json();
        // add all satellites
        for (const d of data) {
            let currentSat = addSatellite(d.data.positions[0].satlatitude, d.data.positions[0].satlongitude, 1, d.data.positions[0].elevation, d.color );
        }
       
    } catch (err) {
        console.error(err);
    }
     addSatellite(45.6793, -111.0373, 1, 0, 0xFF0000);    // Bozeman 
     addSatellite(39.7392, -104.9903, 1, 0, 0xFF0000);    // Denver 
     addSatellite(51.5072, -0.1276, 1, 0, 0xFF0000);      // London
     addSatellite(-33.8727, 151.2057, 1, 0, 0xFF0000);    // Sydney 
}

// Handle form submission
const form = document.getElementById('satellite-panel');

form.addEventListener('submit', (e) => {
    e.preventDefault()

    const rows = form.querySelectorAll('tbody tr')
    const selectedSatellites = []

    rows.forEach(row => {
        const checkbox = row.querySelector('input[type="checkbox"]')
        if (checkbox.checked) {
            const colorInput = row.querySelector('input[type="color"]')
            selectedSatellites.push({
                id: checkbox.value,
                color: colorInput.value
            })
        }
    })
    if (selectedSatellites.length === 0) return
    fetchSatelliteData(selectedSatellites);
});


// Table UI
const toggleBtn = document.getElementById('sat-toggle-btn')
const closeBtn = document.getElementById('sat-close-btn')
const drawer = document.getElementById('satellite-panel')

toggleBtn.addEventListener('click', () => {
    drawer.classList.toggle('open')
    toggleBtn.style.display = 'none'

})

closeBtn.addEventListener('click', () => {
    drawer.classList.remove('open')
    toggleBtn.style.display = 'block'
})
