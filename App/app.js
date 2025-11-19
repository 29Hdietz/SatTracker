const express = require('express')
const app = express()
const path = require('path')
require('dotenv').config()

app.use(express.static(__dirname + '/public'))
app.use('/build/', express.static(path.join(__dirname, 'node_modules/three/build')))
app.use('/jsm/', express.static(path.join(__dirname, 'node_modules/three/examples/jsm')))

app.listen(3000, () => console.log('Visit http://127.0.0.1:3000'))


// Todo - allow user to specify satellite id, satillites.json contains norad ids for popular satellites)
app.get('/satellites', async (req, res) => {
   
    try {
        // Test values for ISS from Bozeman, MT
        const id = 25544;
        const observer_lat = 45.6793;
        const observer_lng = 111.0373;
        const observer_alt = 0;
        const seconds = 2;

        const response = await fetch(`https://api.n2yo.com/rest/v1/satellite/positions/${id}/${observer_lat}/${observer_lng}/${observer_alt}/${seconds}&apiKey=${process.env.API_KEY}`)
        const data = await response.json()
        res.json(data);

    } catch (err) {
        res.status(500).send('Error retrieving satellite data')
    }
})
