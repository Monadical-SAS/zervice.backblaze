#!/usr/bin/env node
// https://github.com/Monadical-SAS/zervice.backblaze
// Usage:
//     cp .env.default .env
//     yarn install
//     ./server.js
//     open http://localhost:8085

const getApp = async (b2, config) => {
    const express = require('express')
    const app = express()

    app.get("/", async (req, res) => {
        console.log('/index.html')
        res.sendFile(__dirname + '/index.html')
    })

    app.post("/b2/get_upload_url", async (req, res) => {
        console.log('/b2/get_upload_url')
        const b2_response = await b2.getUploadUrl({
            bucketId: config.B2_BUCKET_ID,
        })
        console.log('-> ', b2_response.data)
        res.json(b2_response.data)
    })  // -> {uploadUrl, authorizationToken}

    app.post("/b2/delete_file_version", async (req, res) => {
        console.log('/b2/delete_file_version')
        const b2_response = await b2.deleteFileVersion({
            fileId: req.fileId,
            fileName: req.filename,
        })
        console.log('-> ', b2_response.data)
        res.json(b2_response.data)
    })  // -> {fileId, fileName}

    return app
}

const getConfig = (argv, defaults) => {
    require('dotenv').config()
    const env = {
        HTTP_PORT: process.env.HTTP_PORT || '8085',

        B2_APPLICATION_ID: process.env.B2_APPLICATION_ID,
        B2_APPLICATION_KEY: process.env.B2_APPLICATION_KEY,
        B2_BUCKET_ID: process.env.B2_BUCKET_ID,
    }
    const parseArgv = ([HTTP_PORT]) => {
        // looks for any int argument as a port to bind to
        if (HTTP_PORT && !isNaN(Number(HTTP_PORT))) {
            return {HTTP_PORT}
        }
        return {}
        // const nums = argv.filter(arg => !isNaN(Number(arg)))
        // return nums.length ? {HTTP_PORT: nums[0]} : {}
    }
    return {
        ...(defaults || {}),  // defaults are less important than envs or argv
        ...env,               // config defined in .env file or via env vars
        ...parseArgv(argv),   // cli args can override env vars and default
    }
}

const getB2 = async (config) => {
    const B2 = require('backblaze-b2')
    const b2 = new B2({
      applicationKeyId: config.B2_APPLICATION_ID,
      applicationKey: config.B2_APPLICATION_KEY,
    })
    await b2.authorize()
    return b2
}

const startServer = (app, config) => new Promise((resolve, reject) => {
    app.listen(config.HTTP_PORT, resolve)
})

const main = async (argv) => {
    console.log('[+] Starting Zervice.BackBlaze dropbox service...')
    console.info('    - Loading configuration from .env...')
    const config = await getConfig(argv)
    console.info('    - Connecting to Backblaze B2...')
    const b2 = await getB2(config)
    console.info('    - Setting up express app (backend + ui server)...')
    const app = await getApp(b2, config)
    console.info(`    - Starting server on 0.0.0.0:${config.HTTP_PORT}...`)
    await startServer(app, config)
    console.log(`[√] Listening on 0.0.0.0:${config.HTTP_PORT}`)
    console.info(`    - Open http://localhost:${config.HTTP_PORT} to see the UI.`)
}

if (!process.argv.includes('--import')) {
    try {
        // ./server.js 8085
        main(process.argv)
    } catch(e) {
        console.log('[x] Stopped server due to error.')
        console.error(e)
    }
}
