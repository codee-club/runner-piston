#!/usr/bin/env node
require('nocamel')
const path = require('path')
const fs = require('fs/promises')
const fss = require('fs')
const globals = require('./globals')
const config = require('./config')
const package = require('./package')
const logger = require('logplease').create('install-package')

async function main(args) {
    Object.values(globals.data_directories).for_each(dir => {
        let data_path = path.join(config.data_directory, dir);

        logger.debug(`Ensuring ${data_path} exists`);

        if (!fss.exists_sync(data_path)) {
            logger.info(`${data_path} does not exist.. Creating..`);

            try {
                fss.mkdir_sync(data_path);
            } catch (e) {
                logger.error(`Failed to create ${data_path}: `, e.message);
            }
        }
    })

    const [language, version] = args
    const pkg = await package.get_package(language, version)

    if (pkg == null) {
        logger.error(`Requested package ${language}-${version} does not exist`)
    }

    try {
        await pkg.install()
    } catch (e) {
        logger.error(`Error while installing package ${language}-${version}:`, e.message)
    }
}

main(process.argv.slice(2))
