/// Tokenises a string of source code by performing a regular expression, breaking it up into tokens of groups 'name', 'number', 'string' and 'punctuator'.
class Tokenizer
{
    // Attributes
    //-----------
    ///< A reference to the Google re2 regexp2 object that will perform the regular expression capture.
    //_regularExpression = null;
    
    // Constructor
    //------------
    /// Initialises the Tokenizer by:
    /// - Creating and assigning an instance of a RegExp object.
    constructor()
    {
        this._regularExpression = /(\u0020+|\u0009+)|(\/\/.*|\/\*|\*\/)|([_a-zA-Z][a-zA-Z_0-9]*)|(0x[0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)|(\"(?:[^\"\\]|\\(?:[nr\"\\]|x[0-9a-fA-F]{2}))*\"|'(?:[^'\\]|\\(?:[nr'\\]|u[0-9a-fA-F]{4}))*')|(\*=|[(){}\[\]?.,:;~*\/%]|<-|&&?|\|\|?|\^|<<|>>|>>>|==?|!=|\+\+|--|[+\-<>]=?>?|[!=](?:==)?|@)/;
    }

    // Methods
    //--------
    /// Parses (via a regular expression) a source code string, line by line, producing an array of raw (rudimentary) tokens,
    /// categorised as either a 'name', 'number', 'string' or 'punctuator'.
    /// \param  source a string of compatible source code to be parsed and tokenized.
    /// \return an array of raw (rudimentary) tokens.
    parse( source )
    {
        let regularExpression = this._regularExpression;
        let tokens            = [];
        var blockComment      = false;

        // Split the source up into one entry per line
        let lines = source.split( "\n" );

        // Parse each line, one at a time
        lines.forEach( function (line, lineNumber)
        {
            var columnNumber = 0;

            while( columnNumber < line.length )
            {
                let captives = regularExpression.exec( line.substr( columnNumber, line.length ) );

                if( captives == null )
                {
                    break;
                    throw "Syntax Error on line " + lineNumber + " column " + columnNumber;
                }

                if( captives[2] != null )
                {
                    if( blockComment == false )
                    {
                        if( captives[2] == "/*" )
                        {
                            blockComment = true;
                            continue;
                        }
                    }
                    else
                    {
                        if( captives[2] == "*/" )
                        {
                            blockComment = false;
                            continue;
                        }
                    }
                }

                if( blockComment == false )
                {
                    if( captives[3] != null )
                    {
                        // Name
                        tokens.push(
                        {
                            type : "name", value : captives[3],
                            lineNumber : lineNumber, columnNumber : columnNumber
                        });
                    }
                    else if( captives[4] != null )
                    {
                        // Number
                        let number = captives[4];

                        try
                        {
                            if( number.search( "." ) == 0 )
                            {
                                number = parseInt( number );
                            }
                            else
                            {
                                number = parseFloat( number );
                            }
                        }
                        catch( error )
                        {
                            throw "Type Error on line " + lineNumber + " column " + columnNumber;
                        }

                        tokens.push(
                        {
                            type : "number", value : number,
                            lineNumber : lineNumber, columnNumber : columnNumber
                        });
                    }
                    else if( captives[5] != null )
                    {
                        // String
                        tokens.push(
                        {
                            type : "string", value : captives[5],
                            lineNumber : lineNumber, columnNumber : columnNumber
                        });
                    }
                    else if( captives[6] != null )
                    {
                        // Punctuator
                        tokens.push(
                        {
                            type : "punctuator", value : captives[6],
                            lineNumber : lineNumber, columnNumber : columnNumber
                        });
                    }
                }

                var newColumnNumber = 0;

                captives.forEach( function ( captive )
                {
                    if( captive != null && captive.length > newColumnNumber ) { newColumnNumber = captive.length; }
                });

                columnNumber += newColumnNumber;
            }

            if( tokens.length > 0 && tokens[tokens.length-1].type != "newline" )
            {
                tokens.push(
                {
                    type : "newline", value : "\n",
                    lineNumber : lineNumber, columnNumber : columnNumber
                });
            }
        });

        return tokens;
    }
}

export { Tokenizer };