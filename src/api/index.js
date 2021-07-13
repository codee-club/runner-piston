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
        logger.warn(`${language} ${version} runtime not found`)
        res.status(400).send({ error: `${language} ${version} runtime not found` })
        return
    }

    const { inputs, sourceRefs } = req.body
    if (sourceRefs === undefined || sourceRefs.length === 0 || inputs === undefined || Object.keys(inputs).length === 0) {
        logger.warn('Missing inputs or source files')
        res.status(400).json({ error: 'Missing inputs or source files' })
        return
    }
    
    // Download source files
    let files
    try {
        files = await Promise.all(sourceRefs.map((file) => download(file)))
    } catch (error) {
        logger.error('Download source files failed:', error.message)
        res.status(400).json({ error: 'Unable to download source files' })
        return
    }
    logger.debug('Source files downloaded')

    // Run job for each input
    let outputs = {}
    let errorOrInvalid = {}
    for (const inputId of Object.keys(inputs)) {
        const result = await runSingle({ runtime: rt, alias: language, files, stdin: inputs[inputId] })
        logger.debug('Result received')

        // Breaking cases
        if (!result.run) {
            logger.debug('Result is breaking error case: runner failure (unexpected response)')
            errorOrInvalid.error = result.failure || 'Unknown run failure'
            break
        } else if (
                result.run.stderr && (
                    result.run.stderr.includes('compilation failed') || // Java
                    result.run.stderr.startsWith('error: can\'t find main') // Java
                )) {
            logger.debug('Result is breaking error case: compile failure')
            errorOrInvalid.invalid = result.run.stderr
            break
        }
        
        // Non-breaking cases
        if (result.run.stderr || result.run.signal || result.run.code) {
            logger.debug('Result is non-breaking error case: ' + JSON.stringify(result.run))
            const error = result.run.stderr || 
                (result.run.signal === 'SIGKILL' ? 'Timeout' : `Code ${result.run.code} Signal ${result.run.signal}`)
            outputs[inputId] = { error, output: result.run.stdout }
        } else {
            // Happy case
            logger.debug('Result is success case: ' + JSON.stringify(result.run))
            outputs[inputId] = { output: result.run.stdout }
        }
    }

    res.json(Object.keys(errorOrInvalid).length > 0 ? errorOrInvalid : { outputs })
}

async function runSingle(jobParams) {
    const job = new Job({
        ...jobParams,
        args: [],
        timeouts: {
            run: 10000,
            compile: 10000,
        },
        memory_limits: {
            run: config.run_memory_limit,
            compile: config.compile_memory_limit,
        }
    })
    try {
        await job.prime()
    } catch (error) {
        logger.error('Prime failed:', error.message)
        return { failure: `Prime failed: ${error.message}`}
    }
    const result = await job.execute().catch(error => {
        logger.error('Execute failed:', error.message)
        return { failure: `Execute failed: ${error.message}`}
    })
    await job.cleanup().catch(error => {
        logger.warn('Cleanup failed:', error.message)
    })
    return result
}

function capitalize(name) {
    return (name.charAt(0).toUpperCase() + name.slice(1))
        .replace('script', 'Script')
        .replace('Php', 'PHP')
}

module.exports = router
