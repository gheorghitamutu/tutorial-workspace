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

function processCommand(input, dsuInstance) {
    const args = input.trim().split(' ');
    const command = args[0];

    switch (command) {
        case 'ls':
            dsuInstance.readDir(currentDirectory, { recursive: true }, (err, files) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log(`Listing directory file contents:\n${files.join('\n')}`);
                }
            });
            break;
        case 'touch':
            const filePath = args[1];
            const absolutePath = filePath.startsWith('/') ? filePath : `${currentDirectory}/${filePath}`;
            const fileName = absolutePath.split('/').pop();
            const directoryPath = absolutePath.split('/').slice(0, -1).join('/');
            dsuInstance.writeFile(`${directoryPath}/${fileName}`, '', (err) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log(`Created file ${fileName} in directory ${directoryPath}`);
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
                let targetDirectory = directory.startsWith('/') ? directory : `${currentDirectory}/${directory}`;
                if (targetDirectory.startsWith('//')) {
                    targetDirectory = targetDirectory.replace('//', '/');
                }
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
            const dirPath = args[1];
            let absDirPath = dirPath.startsWith('/') ? dirPath : `${currentDirectory}/${dirPath}`;

            if (absDirPath.startsWith('//')) {
                absDirPath = absDirPath.replace('//', '/');
            }
            dsuInstance.createFolder(absDirPath, (err) => {
                if (err) {
                    console.error(`Error creating directory ${absDirPath}: ${err}`);
                } else {
                    console.log(`Created directory ${absDirPath}`);
                }
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
