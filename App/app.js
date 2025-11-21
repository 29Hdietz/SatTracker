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
        if (!req.body.satellites && req.body.satellites.length === 0) {
            return res.status(400).send('No satellites provided')
        }

        results = []
        for (const sat of req.body.satellites) {
            const id = parseInt(sat.id)
            const response = await fetch(`https://api.n2yo.com/rest/v1/satellite/positions/${id}/45.6793/111.0373/0/2&apiKey=${process.env.API_KEY}`)
            const data = await response.json()
            results.push({
                data: data,
                color: sat.color
            })
        }
        res.json(results)

    } catch (err) {
        res.status(500).send('Error retrieving satellite data')
    }
})
