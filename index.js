const express = require("express")
const multer = require("multer")
const os = require("os")
const fs = require('fs')
const google = require('@googleapis/drive')

const GDRIVE_FOLDER_ID = process.env.GDRIVE_FOLDER_ID

const auth = new google.auth.GoogleAuth({
    keyFilename: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/drive']
})

const upload = multer({
    storage: multer.diskStorage({
        destination: os.tmpdir(), 
        filename: (req, file, callback) => callback(null, `${file.originalname}`)
    })
})

const app = express()

app.get('/status', (req, res) => res.send('Working'))

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const {file} = req
        if(!file) return res.status(400).send('file is required')

        const drive = await google.drive({version: 'v3', auth})

        const result = await drive.files.create({
            media: {
                mimeType: file.mimeType,
                body: fs.createReadStream(file.path)
            },
            requestBody: {
                name: file.originalname,
                parents: [GDRIVE_FOLDER_ID]
            }
        })

        if(result.status === 200) {
            console.log(`'${file.originalname}' Uploaded successfully. Drive ID: ${result.data.id}`)
            
            fs.unlink(file.path, error => {
                if(error) {
                    console.log('Unable to delete temporary file. Error: %s', error.message)
                }
                else {
                    console.log(`'${file.originalname}' temporary file deleted successfully`)
                }
            })

            res.send('Uploaded successfully')
        }
        else {
            console.log(result)
            res.send('Something went wrong on our end.')
        }
    }
    catch (error) {
        console.log(`${error.status}: ${error.message}`)
        res.status(500).send('Server Error: Something went wrong on our end. Please try again later or contact admin for assistance.')
    }
})

if(GDRIVE_FOLDER_ID) {
    const PORT = process.env.PORT || 3000
    app.listen(PORT, () => console.log(`Listening on port: ${PORT}`))
}
else throw new Error('<GDRIVE_FOLDER_ID> env variable is not defined')