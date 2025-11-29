const express = require('express')
const app = express()
const path = require('path')
const satData = require('./satellites.json')
require('dotenv').config()

app.use(express.json())
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'))
app.use('/build/', express.static(path.join(__dirname, 'node_modules/three/build')))
app.use('/jsm/', express.static(path.join(__dirname, 'node_modules/three/examples/jsm')))

app.listen(3000, () => console.log('Visit http://127.0.0.1:3000'))

// Send main page
app.get('/', (req, res) => {
    try {
        res.render('index', { satData: satData })
    } catch (err) {
        res.status(500).send('Server Error')
    }
})

// Endpoint to fetch satellite data
app.post('/satellites', async (req, res) => {
    try {
        const sats = req.body.satellites;
        if (!sats || sats.length === 0) {
            return res.status(400).send('No satellites provided');
        }

        const fetches = sats.map(sat => {
            const id = parseInt(sat.id);

            return fetch(`https://api.n2yo.com/rest/v1/satellite/positions/${id}/45.6793/111.0373/0/2?apiKey=${process.env.API_KEY}`)
                .then(response => response.json())
                .then(data => ({
                    data: data,
                    color: sat.color
                }));
        });

        const results = await Promise.all(fetches);

        res.json(results);

    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving satellite data');
    }
});
