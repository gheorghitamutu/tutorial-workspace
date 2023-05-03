// load environment
require("../opendsu-sdk/psknode/bundles/openDSU");

// load SDK
const opendsu = require("opendsu");

// load libraries
const resolver = opendsu.loadApi("resolver");
const keyssispace = opendsu.loadApi("keyssi");

// Create a template keySSI (for default domain). See /conf/BDNS.hosts.json.
const templateSSI = keyssispace.createTemplateSeedSSI('default');

let data = {"message": "Hello world!"};

resolver.createDSU(templateSSI, (err, dsuInstance) => {
    if (err) {
        throw err;
    }

    // Methods found in: /modules/bar/lib/Archive.js
    dsuInstance.writeFile('/data', JSON.stringify(data), (err) => {
        // Reached when data written to BrickStorage
        if (err) {
            throw err;
        }
        console.log("Data written successfully! :)");

        dsuInstance.getKeySSIAsString((err, keyIdentifier) => {
            console.log("KeySSI identifier: ", keyIdentifier);

            resolver.loadDSU(keyIdentifier, (err, anotherDSUInstance) => {
                if (err) {
                    throw err;
                }

                anotherDSUInstance.readFile('/data', (err, data) => {
                    if (err) {
                        throw err;
                    }

                    const dataObject = JSON.parse(data.toString());
                    console.log("Data load successfully! :)", dataObject.message);
                });

                let options = {
                    'recursive': true,
                    'ignoreMounts': false
                }

                dsuInstance.listFolders('/', options, (err, p) => {
                    if (err) {
                        throw err;
                    }

                    console.log("Folder: ", p);
                });

                dsuInstance.listFiles('/', options, (err, p) => {
                    if (err) {
                        throw err;
                    }

                    console.log("File: ", p);
                });
            });
        });
    });
});
