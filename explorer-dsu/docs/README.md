# DSU Explorer

- [DSU Explorer](#dsu-explorer)
  - [Implemented operations](#implemented-operations)
    - [File](#file)
    - [DSU](#dsu)
    - [Code Documentation](#code-documentation)
    - [References](#references)
    - [Auxiliary](#auxiliary)


Allows the user to navigate through the files of a newly created DSU in a Linux manner.
Implements:
- the behaviour of basic UNIX file navigation commands.
- several commands from TotalCommander taken as example from [here](https://www.ghisler.com/featurel.htm)

## Implemented operations

### File
* ls => list the files
* touch <file_name> => creates a file
* cd <target_directory_name> - go to directory
* mkdir <new_directory_name> - create directory
* write - write the content of a file to a specified path
* cat - gets the file content
* sha256 - calculates sha256 of a file
* dups - finds duplicate files
* pwd - print working directory

### DSU
* We are initializing a DSU if none is found (via Enclaves APIs).

### Code Documentation
Documentation has been generated via [JSDoc](https://jsdoc.app) and can be found [here](./out);
It can be regerenated using the command:
    
    jsdoc main.js
This requires global installation of the jsdoc module:

    npm install -g jsdoc

### References
We used the documentation written [here](https://opendsu.com) for OpenDSU, more specifcally [DSU Object (RFC063)](https://opendsu.com/rfc063) and [Enclaves (RFC-097)](https://opendsu.com/rfc097).

### Auxiliary
[PDF Documentation](./ReadMe.pdf) has been created using [pandoc](https://pandoc.org) with [pdflatex](https://www.math.rug.nl/~trentelman/jacob/pdflatex/pdflatex.html) engine from a markdown [file](./README.md).
Command:

    pandoc README.md -f markdown-implicit_figures -s -o ReadMe.pdf        
