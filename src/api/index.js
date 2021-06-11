const express = require('express')
const router = express.Router()
const logger = require('logplease').create('codee')

const config = require('../config')
const runtime = require('../runtime')
const { Job } = require('../job')
const package = require('../package')
const download = require('./download')

router.use((req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next()
    }
    if (!req.headers['content-type'].startsWith('application/json')) {
        return res.status(415).send({
            message: 'requests must be of type application/json',
        })
    }
    next()
})

router.get('/', (req, res) => {
    const languages = runtime.map(rt => ({
        name: capitalize(rt.language),
        version: rt.version.raw,
        path: `/${rt.language}-${rt.version.raw}`
    }))

    res.json({ languages })
})


router.post('/:slug', (req, res) => {
    const [language, version] = req.params.slug.split('-')
    runAll(language, version, req, res)
})


async function runAll (language, version, req, res) {
    const rt = runtime.get_latest_runtime_matching_language_version(language, version)
    if (rt === undefined) {
        res.status(400).send({ error: `${language} ${version} runtime not found` })
        return
    }

    const { inputs, sourceRefs } = req.body
    if (sourceRefs === undefined || sourceRefs.length === 0 || inputs === undefined || Object.keys(inputs).length === 0) {
        res.status(400).json({ error: 'Missing inputs or source files' })
        return
    }

    // Download source files
    let files
    try {
        files = await Promise.all(sourceRefs.map((file) => download(file)))
    } catch (err) {
        console.log(err)
        res.status(400).json({ error: 'Unable to download source files' })
        return
    }

    // Run job for each input
    let outputs = {}
    for (const inputId of Object.keys(inputs)) {
        const result = await runSingle({ runtime: rt, alias: language, files, stdin: inputs[inputId] })
        console.log(result)
        outputs[inputId] = { output: result.run.stdout, error: result.run.stderr } // TODO
    }

    res.status(200).send({ outputs })
}

async function runSingle(jobParams) {
    const job = new Job({
        ...jobParams,
        args: [],
        timeouts: {
            run: 3000,
            compile: 10000,
        },
        memory_limits: {
            run: config.run_memory_limit,
            compile: config.compile_memory_limit,
        }
    })
    await job.prime()
    const result = await job.execute()
    await job.cleanup()
    return result
}

function capitalize(name) {
    return (name.charAt(0).toUpperCase() + name.slice(1))
        .replace('script', 'Script')
        .replace('Php', 'PHP')
}

module.exports = router
