import * as THREE from 'three'
import { OrbitControls } from './jsm/controls/OrbitControls.js'
import Stats from './jsm/libs/stats.module.js'
import { GUI } from './jsm/libs/lil-gui.module.min.js'

const SCENE_EARTH_RADIUS = 1
const EARTH_RADIUS_KM = 6371

// Visual only (higher values move satillites farther away from earth)
const ALTITUDE_SCALE = 0.5

let ACTIVE_SATELLITES = []
let ORBIT_TRAILS = []
const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.z = 2.5

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)

// --- Earth ---
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load('textures/00_earthmap1k.jpg');

const earthGeometry = new THREE.SphereGeometry(1, 32, 32)
const earthMaterial = new THREE.MeshPhongMaterial({ map: earthTexture })
const earth = new THREE.Mesh(earthGeometry, earthMaterial)
earth.rotation.y = Math.PI;
scene.add(earth)

// Helper to make satellite/city texture
function makeCircleTexture(size = 32, color = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
}

// --- Light ---
const light = new THREE.AmbientLight(0xffffff, 1)
scene.add(light)


// --- Satellites ---
const sharedSatTexture = makeCircleTexture(32, '#ffffff');

function addSatellite(raDeg, decDeg, elevation, color = 0xffffff, trailLength = 250) {
    // Satellite mesh
    const satMeshGeometry = new THREE.BufferGeometry();
    satMeshGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));

    const satMaterial = new THREE.PointsMaterial({
        color,
        size: 0.05,
        map: sharedSatTexture,
        alphaTest: 0.5,
        transparent: true
    });

    const altitude = SCENE_EARTH_RADIUS + (elevation / EARTH_RADIUS_KM);

    const sat = new THREE.Points(satMeshGeometry, satMaterial);
    scene.add(sat);

    // Orbit points (precomputed)
    const orbitPoints = generateOrbitPointsRA(raDeg, decDeg, altitude);

    // Trail setup
    const trailPositions = new Float32Array(trailLength * 3); // x,y,z per point
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));

    const trailMaterial = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.5
    });

    const orbitTrail = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(orbitTrail);
    ORBIT_TRAILS.push(orbitTrail);

    ACTIVE_SATELLITES.push({
        mesh: sat,
        orbitPoints,
        trailGeometry,
        trailLength,
        currentIndex: 0
    });

    return sat;
}

// --- Remove all satellites ---
function removeAllSatellites() {
    for (const sat of ACTIVE_SATELLITES) scene.remove(sat.mesh)
    for (const trail of ORBIT_TRAILS) scene.remove(trail)
    ACTIVE_SATELLITES = []
    ORBIT_TRAILS = []
}

// --- Generate orbit points for satellites using RA/Dec ---
function generateOrbitPointsRA(raDeg, decDeg, elevation, numPoints = 500) {
    const points = [];
    const orbitRadius = ALTITUDE_SCALE + elevation;

    const decRad = THREE.MathUtils.degToRad(decDeg);
    const raRad = THREE.MathUtils.degToRad(raDeg); 

    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2; // orbit angle
        let x = orbitRadius * Math.cos(angle);
        let y = 0;
        let z = orbitRadius * Math.sin(angle);

        // rotate by declination (tilt)
        const cosD = Math.cos(decRad);
        const sinD = Math.sin(decRad);
        let yRot = y * cosD - z * sinD;
        let zRot = y * sinD + z * cosD;

        // rotate orbit by RA (around Y axis)
        const cosRA = Math.cos(raRad);
        const sinRA = Math.sin(raRad);
        const xRot = x * cosRA - zRot * sinRA;
        const zFinal = x * sinRA + zRot * cosRA;

        points.push(new THREE.Vector3(xRot, yRot, zFinal));
    }

    return points;
}

// --- Add City markers using lat/lon ---
function addCity(lat, lon, radius = 1, color = 0xffff00, size = 0.02) {
    const cityTexture = makeCircleTexture(32, `#${color.toString(16).padStart(6,'0')}`);
    const cityMaterial = new THREE.PointsMaterial({
        color,
        size,
        map: cityTexture,
        alphaTest: 0.5,
        transparent: true
    });

    // Convert lat/lon to 3D vector on Earth surface
    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon) * -1;
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    const cityGeometry = new THREE.BufferGeometry();
    cityGeometry.setAttribute('position', new THREE.Float32BufferAttribute([x, y, z], 3));

    const city = new THREE.Points(cityGeometry, cityMaterial);
    earth.add(city);
    return city;
}

// --- Test cities ---
addCity(45.6793, -111.0373)    // Bozeman
addCity(39.7392, -104.9903)    // Denver
addCity(51.5072, -0.1276)      // London
addCity(-33.8727, 151.2057)    // Sydney

// --- Resize handler ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}, false)

// --- Stats & GUI ---
const stats = Stats()
document.body.appendChild(stats.dom)

const gui = new GUI()
const cameraFolder = gui.addFolder('Camera')
cameraFolder.add(camera.position, 'z', 0, 10)
cameraFolder.open()

stats.dom.style.left = 'auto';
stats.dom.style.right = (gui.domElement.offsetWidth + 15) + 'px';

// --- Animate satellites ---
let lastStatsUpdate = 0;

function animate(time) {
    requestAnimationFrame(animate);
    // earth.rotation.y += 0.001;  

    for (const sat of ACTIVE_SATELLITES) {
        sat.currentIndex = (sat.currentIndex + 1) % sat.orbitPoints.length;
        const pos = sat.orbitPoints[sat.currentIndex];
        sat.mesh.position.set(pos.x, pos.y, pos.z);

        // Update trail
        const trailAttr = sat.trailGeometry.getAttribute('position');
        // Shift positions back
        for (let i = sat.trailLength - 1; i > 0; i--) {
            trailAttr.setXYZ(i, ...trailAttr.array.slice((i-1)*3, (i-1)*3 + 3));
        }
        // Set newest point to current satellite position
        trailAttr.setXYZ(0, pos.x, pos.y, pos.z);
        trailAttr.needsUpdate = true;
    }

    controls.update();
    render();
    stats.update();
}

function render() {
    renderer.render(scene, camera)
}

animate()

// --- Fetch satellite data ---
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
            let currentSat = addSatellite(d.data.positions[0].ra, d.data.positions[0].dec, d.data.positions[0].elevation, d.color );
        }
       
    } catch (err) {
        console.error(err);
    }

}

// --- Handle form submission ---
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


// --- Table UI ---
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
