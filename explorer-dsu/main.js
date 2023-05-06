// load environment
require("../opendsu-sdk/psknode/bundles/openDSU");

// load SDK
const opendsu = require("opendsu");

// load libraries
const resolver = opendsu.loadApi("resolver");
const keyssispace = opendsu.loadApi("keyssi");

// Create a template keySSI (for default domain). See /conf/BDNS.hosts.json.
const templateSSI = keyssispace.createTemplateSeedSSI('default');

let data = { "message": "Hello world!" };

let currentDirectory = '/';

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Function that interprets the input from the user and executes the command
 * 
 * If provided with 'exit', it will stop the execution
 * 
 * This function is called inside the recursion of the promptCommand function
 * 
 * @param {The input from the user} input 
 * @param {The DSU instance} dsuInstance 
 */
function processCommand(input, dsuInstance) {
    const args = input.trim().split(' ');
    const command = args[0];

    switch (command) {
        case 'ls':
            dsuInstance.readDir(currentDirectory, { recursive: true }, (err, files) => {
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
                dsuInstance.delete(absPathToRm, { recursive: true }, (err, files) => {
                    if (err) {
                        console.error(`Error deleting file: ${err}`);
                    } else {
                        console.log(`Successfully deleted file ${absPathToRm}`);
                    }
                });
            }
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
 * 
 * @param {The path of a file, absolute or otherwise} path 
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
 * 
 * @param {The DSU instance} dsuInstance 
 */
function promptCommand(dsuInstance) {
    readline.question('[' + currentDirectory + '] Enter a command: ', input => {
        console.log('\n');
        processCommand(input, dsuInstance);
        promptCommand(dsuInstance);
    });
}

resolver.createDSU(templateSSI, (err, dsuInstance) => {
    if (err) {
        throw err;
    }

    promptCommand(dsuInstance);
});
