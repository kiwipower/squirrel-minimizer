import {Tokenizer} from './tokenizer.js';
import {Minimizer} from './minimizer.js';
import fs from 'fs'
import commandLineArgs from 'command-line-args';

const optionDefinitions =
[
    { name: 'input', alias: 'i', type: String, defaultValue: null, defaultOption: true },
    { name: 'output', alias: 'o', type: String, defaultValue: null },
    { name: 'stringstoconst', alias: 's', type: Boolean, defaultValue: false },
    { name: 'keepnewlines', alias: 'k', type: Boolean, defaultValue: false }
];

const options = commandLineArgs( optionDefinitions );

// Load the file to be minimized
if( options.input == null )
{
    console.error( "No Input file specified." );
    process.exit( -1 );
}

let inputFile = fs.readFileSync( options.input ).toString();

let tokenizer = new Tokenizer();
let minimizer = new Minimizer();

// Tokenize the file
console.log( "Tokenizing source code" );
let tokens = tokenizer.parse( inputFile );
tokens = minimizer.estimateScope( tokens );

// Combine duplicate strings
if( options.stringstoconst == true )
{
    console.log( "Combining Duplicate Strings." );
    tokens = minimizer.combineDuplicateStrings( tokens );
}

// Combine duplicate strings
let output;

if( options.keepnewlines == true )
{
    console.log( "Rebuilding the source without new lines removed." );
    output = minimizer.rebuild( tokens, false );
}
else
{
    console.log( "Rebuilding the source with new lines removed." );
    output = minimizer.rebuild( tokens );
}

// Output the minimized file
if( options.output == null )
{
    fs.writeFileSync( options.input + ".m.nut", output );
}
else
{
    fs.writeFileSync( options.output, output );
}