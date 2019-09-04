# Squirrel Minimizer

## Requirements
- Node.js v12.x or newer.

## Setup
- Run ```npm install``` from the command-line after checking-out from git.

## Default Command-line Usage
- ```npm run minimize --i "mySourceFile.nut"``` - Will minimize source by removing all new lines.

## Command-line Options
- ```--i|input "mySourceFile.nut"``` - Specifies the name of the input file to be minimized (required).
- ```--o|output "myOutputFile.nut"``` - Specifies the name of the minimised output file (othewise defaults to inputFileName.m.nut).
- ```--s|stringstoconst``` - Expermiental string minimization by transforming duplicate strings to shared consts.
- ```--k|keepnewlines``` - Keeps new lines (useful to debug raw tokenized output).

## Limitations
As a highly dynamic language, Squirrel features several constructs that are indistinguishable at the token/lexer level. For example:

```
if( true )
{
    myVar = false
    myVar2 = false
}
```

Appears identical to:

```
local myTable = 
{
    myKey = false
    mykey2 = false
}
```

Yet when removing new-lines, a semi-colon is required within the IF statement, and a comma within the table assignment.

For the minimizer to work, please ensure values are comma-separated within table assignments.

There may well still be other use-cases where the minimizer trips-up. Consider code quality as well before updating the minimizer.