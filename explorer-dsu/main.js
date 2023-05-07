// load environment
require("../opendsu-sdk/psknode/bundles/openDSU");

// load SDK
const opendsu = require("opendsu");

// load libraries
const resolver = opendsu.loadApi("resolver");
const keyssispace = opendsu.loadApi("keyssi");

// Create a template keySSI (for default domain). See /conf/BDNS.hosts.json.
const templateSSI = keyssispace.createTemplateSeedSSI('default');


// other requirements
const fs = require('fs');
const crypto = require('crypto');
const pathModule = require('path');

let currentDirectory = '/';

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Function that interprets the input from the user and executes the command
 * If provided with 'exit', it will stop the execution
 * This function is called inside the recursion of the promptCommand function
 * @method
 * @param {*} input - from the user
 * @param {*} dsuInstance - a DSU instance
 * @returns {undefined}
 */
function processCommand(input, dsuInstance) {
    const args = input.trim().split(' ');
    const command = args[0];

    switch (command) {
        case 'ls':
            dsuInstance.readDir(currentDirectory, {recursive: true}, (err, files) => {
                if (err) {
                    console.error(`Error listing files: ${err}`);
                } else {
                    console.log(`Listing directory file contents:\n${files.join('\n')}`);
                }
            });
            break;
        case 'touch':
            const filePath = args[1];
            let fileToCreate = getAbsolutePath(filePath);
            dsuInstance.writeFile(fileToCreate, '', (err) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log(`Created file ${fileToCreate}`);
                }
            });
            break;
        case 'cd':
            const directory = args[1];
            if (directory == '..') {
                if (currentDirectory == "/") {
                    console.log("Already in root directory.")
                } else {
                    const parts = currentDirectory.split('/').filter(Boolean);
                    parts.pop();
                    currentDirectory = `/${parts.join('/')}`;
                }
            } else {
                let targetDirectory = getAbsolutePath(directory)
                dsuInstance.readDir(targetDirectory, (err, files) => {
                    if (err) {
                        console.error(`Error checking directory ${targetDirectory}: ${err}`);
                    } else {
                        currentDirectory = targetDirectory;
                        console.log(`Changing directory to ${currentDirectory}...`);
                    }
                });
            }
            break;
        case 'mkdir':
            let dirPath = args[1];
            let absDirPath = getAbsolutePath(dirPath)
            dsuInstance.createFolder(absDirPath, (err) => {
                if (err) {
                    console.error(`Error creating directory ${absDirPath}: ${err}`);
                } else {
                    console.log(`Created directory ${absDirPath}`);
                }
            });
            break;
        case 'rm':
            let fileToRm = args[1];
            let absPathToRm = getAbsolutePath(fileToRm)
            if (absPathToRm == currentDirectory) {
                console.log('Cannot delete current directory')
            } else {
                dsuInstance.delete(absPathToRm, {recursive: true}, (err, files) => {
                    if (err) {
                        console.error(`Error deleting file: ${err}`);
                    } else {
                        console.log(`Successfully deleted file ${absPathToRm}`);
                    }
                });
            }
        case 'write':
            let filePathToWrite = args[1];
            let contentToWrite = args[2];

            writeToDsu(dsuInstance, filePathToWrite, contentToWrite);
            break;
        case 'cat':
            let filePathToRead = args[1];

            // filePathToRead = getAbsolutePath(filePathToRead);

            getFileContents(dsuInstance, filePathToRead).then((content) => {

                let humanReadableContent = content;

                console.log('========== File contents: =========')
                console.log(humanReadableContent);
                console.log('========== End of content =========')
            });

            break;
        case 'sha256':
            let filePathToHash = args[1];

            filePathToHash = getAbsolutePath(filePathToHash);

            calculateHashForFile(dsuInstance, filePathToHash).then((hash) => {
                console.log(`SHA256 hash of file ${filePathToHash}: ${hash}`);
            });
            break;

        case 'dups':
            let directoryToCheck = getAbsolutePath(args[1] ?? currentDirectory);

            getDuplicates(dsuInstance, directoryToCheck)
                .then((duplicates) => {

                    let duplicatesCounts = 0;
                    let currentGroupId = 1;

                    for (let [key, value] of duplicates) {
                        console.log(key + ' = ' + value);

                        if (value.length > 1) {
                            console.log(`=== Duplicates group ${currentGroupId++}: ${value.length} files with same content ===`);
                            console.log(value.join('\t'));
                            duplicatesCounts += 1;
                        }
                    }

                    console.log(`Total unique files duplicated (once or multiple): ${duplicatesCounts}`);

                });
            break;
        case 'pwd':
            console.log(currentDirectory);
            break;
        case 'exit':
            console.log('Exiting program...');
            readline.close();
            process.exit(0);
        default:
            console.log(`Invalid command: ${command}`);
    }
}

/**
 * Get the absolute path of a file or folder.
 * @param {String} path - The path of a file, absolute or otherwise
 * @returns Absolute path of provided file
 */
function getAbsolutePath(path) {
    let absPath = path.startsWith('/') ? path : `${currentDirectory}/${path}`;
    if (absPath.startsWith('//')) {
        absPath = absPath.replace('//', '/');
    }
    return absPath
}

/**
 * Function that prompts the user to provide a command, and then recursively calls itself
 * @method
 * @param {*    } dsuInstance - a DSU instance
 */
function promptCommand(dsuInstance) {
    readline.question('[' + currentDirectory + '] Enter a command: ', input => {
        console.log('\n');
        processCommand(input, dsuInstance);
        promptCommand(dsuInstance);
    });
}

/**
 * Writes to a file with the provided path from a DSU instance the content provided.
 * @param {*} dsuInstance - a DSU instance
 * @param {*} path - target path of the file where we are writing
 * @param {*} content - content to be written to the target path
 */
async function writeToDsu(dsuInstance, path, content) {

    files = await listFilesFromDsu(dsuInstance, path);

    if (files.includes(path)) {
        console.log(`File ${path} already exists. Overwriting...`);

    } else {
        console.log(`File ${path} does not exist. Creating...`);
    }

    let fileToCreate = getAbsolutePath(path);
    dsuInstance.writeFile(fileToCreate, content, (err) => {
        if (err) {
            console.error(err);
        } else {
            console.log(`Created file ${fileToCreate}`);
        }
    });
}

/**
 * Gets the content of a file from a DSU from the provided path.
 * @param {*} dsuInstance - a DSU instance 
 * @param {*} path - target path
 * @returns {undefined}
 */
async function getFileContents(dsuInstance, path) {

    let outerPath = pathModule.basename(getAbsolutePath(path));

    existentFiles = await listFilesFromDsu(dsuInstance, outerPath);

    console.log(`Existent files in ${outerPath} : `)
    console.log(existentFiles);

    if (existentFiles.includes(path)) {
        console.log(`File ${path} exists. Reading from it...`);
    } else {
        console.log(`File ${path} does not exist. Aborting...`);
    }

    return new Promise((resolve, reject) => {
        dsuInstance.readFile(path, (err, data) => {
            if (err) {
                console.error(`Error reading file ${path}: ${err}`);
                reject(err);
            } else {
                console.log(`Read file ${path}`);

                var humanReadableContent = data.toString('utf8');

                resolve(humanReadableContent);
            }
        });
    });

}

/**
 * List the file from a specific DSU instance.
 * @async
 * @param {*} dsuInstance - a DSU instance
 * @param {*} path - target path
 * @param {*} recursive - should enter recursive
 * @param {*} includeFolders - should list folders
 * @returns {undefined}
 */
async function listFilesFromDsu(dsuInstance, path, recursive = false, includeFolders = true) {

    return new Promise((resolve, reject) => {

        let targetDir = path;

        dsuInstance.readDir(targetDir, {
            recursive: recursive,
            withFileTypes: true,
        }, (err, entries) => {
            if (err) {
                console.error(`Error listing files: ${err}`);

                reject(err);

                throw err;
            } else {

                let results = [];

                results = results.concat(entries.files);

                if (includeFolders) {
                    results.concat(entries.directories);
                }

                console.log(`Listing files:\n${entries.files.join('\n')}`);

                resolve(results);
            }
        });
    });
}

/**
 * Get duplicated files from a provided path.
 * @async
 * @param {*} dsuInstance - a DSU instance  
 * @param {*} path - root path where we are searching for duplicates
 * @returns {undefined}
 */
async function getDuplicates(dsuInstance, path) {

    files = await listFilesFromDsu(dsuInstance, path, true, false);

    let hashToFilesMap = new Map();

    for (let file of files) {
        let hash = await calculateHashForFile(dsuInstance, getAbsolutePath(file));


        if (hashToFilesMap.has(hash)) {
            let processedFilesWithHash = [];

            processedFilesWithHash = hashToFilesMap.get(hash);

            processedFilesWithHash.push(file);

            hashToFilesMap[hash] = processedFilesWithHash;
        } else {
            hashToFilesMap.set(hash, [file]);
        }
    }

    return hashToFilesMap;
}

/**
 * Calculate SHA256 hash for a given file inside a DSU instance.
 * @async
 * @param {*} dsuInstance - a DSU instance
 * @param {*} path - path of the file for which the hash is calculated
 * @returns {undefined}
 */
async function calculateHashForFile(dsuInstance, path) {

    return new Promise((resolve, reject) => {

        getFileContents(dsuInstance, path).then((content) => {

            console.log(`Calculating hash for file ${path}`);
            console.log(`File content: ${content}`);

            let hash = crypto.createHash('sha256').update(content).digest('hex');

            resolve(hash);
        });

    });
}

/**
 * Initialize default DSU (it creates it if it does not exist).
 * @async
 * @returns {undefined}
 */
async function initializeToDefaultDsuCreateIfNotExists() {


    // Create a DSU instance if not exists in dsu_s.json

    //read the dsu_s.json file as json
    let dsu_s = JSON.parse(fs.readFileSync('dsu_s.json', 'utf8'));

    //check if the file exists


    if (dsu_s && "dsus" in dsu_s && dsu_s.dsus.length > 0) {
        //if it does, load the DSU

        resolver.loadDSU(dsu_s.dsus[0].key, (err, dsuInstance) => {
            if (err) {
                throw err;
            }
            promptCommand(dsuInstance);
        });
        return;
    } else {
        //if it doesn't, create a new DSU and save key to dsu_s.json

        dsu_s = {
            dsus: []
        }

        // dsuInstance = await $$.promisify(resolver.createDSU)(templateSSI)
        dsuInstance = await new Promise((resolve, reject) => {
            resolver.createDSU(templateSSI, (err, dsuInstance) => {
                if (err) {
                    reject(err);

                    throw err;
                }


                resolve(dsuInstance);
            });
        });

        dsuKey = await new Promise((resolve, reject) => {
            dsuInstance.getKeySSIAsString((err, key) => {
                if (err) {
                    reject(err);
                    throw err;
                }
                resolve(key);
            });
        });

        console.log("Created DSU with key: " + dsuKey);

        //save the key to dsu_s.json

        let dsu = {
            key: dsuKey,
            name: "default",
            type: "filesystem like dsu?"
        }


        dsu_s.dsus.push(dsu);

        fs.writeFileSync('dsu_s.json', JSON.stringify(dsu_s), 'utf8');
    }
}

/**
 * Start of the CLI program.
 */
initializeToDefaultDsuCreateIfNotExists().then(console.log("done"));
