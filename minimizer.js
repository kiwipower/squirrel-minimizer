class ScopeNode
{
    constructor( parentNode = null, type = null, subType = null )
    {
        this._parent        = parentNode;
        this._children      = [];
        this._iChild        = 0;
        this._type          = type;
        this._subType       = subType;
        this._commaObserved = false;
        this._caseObserved  = false;
    }

    commaObserved()
    {
        this._commaObserved  = true;
    }

    wasCommaObserved()
    {
        return this._commaObserved;
    }

    caseObserved()
    {
        this._caseObserved  = true;
    }

    wasCaseObserved()
    {
        return this._caseObserved;
    }

    getScopeType()
    {
        return this._type;
    }

    getScopeSubType()
    {
        return this._subType;
    }

    resetStepSequence()
    {
        this._iChild = 0;
    }

    stepIn( type = null, subType = null )
    {
        if( this._iChild >= this._children.length )
        {
            let child = new ScopeNode( this );
            child._type     = type;
            child._subType  = subType;
            this._children.push( child );
        }

        return this._children[this._iChild++];
    }

    stepOut()
    {
        if( this._parent == null ) { console.log("triggered");}
        this.resetStepSequence();
        return (this._parent == null ? this : this._parent);
    }
}

class Minimizer
{
    estimateScope( tokens )
    {
        let braceDepth          = 0;
        let curlyBraceDepth     = 0;
        let squareBraceDepth    = 0;
        let scope               = new ScopeNode();        

        tokens.forEach( function ( token, index )
        {
            if( token.type == "punctuator" )
            {
                if( token.value == "(" ) { ++braceDepth; scope = scope.stepIn( "brace" ); }
                else if( token.value == ")" ) { --braceDepth; scope = scope.stepOut(); }
                else if( token.value == "{" )
                {
                    ++curlyBraceDepth;
                    
                    let lastLastToken = index-2 > 0 ? tokens[index-2] : null;

                    if( lastLastToken != null && lastLastToken.value == "enum" )
                    {
                        scope = scope.stepIn( "curlyBrace", "enum" );
                    }
                    else
                    {
                        scope = scope.stepIn( "curlyBrace" );
                    }
                }
                else if( token.value == "}" ) { --curlyBraceDepth; scope = scope.stepOut(); }
                else if( token.value == "[" ) { ++squareBraceDepth; scope = scope.stepIn( "squareBrace" ); }
                else if( token.value == "]" ) { --squareBraceDepth; scope = scope.stepOut(); }
                else if( token.value == "," ) { scope.commaObserved(); }
            }

            if( token.type == "name" )
            {
                if( token.value == "case" ) { scope.caseObserved(); }
            }
        });

        scope.resetStepSequence();

        tokens.forEach( function ( token )
        {
            if( token.type == "punctuator" )
            {
                if( token.value == "(" ) { ++braceDepth; scope = scope.stepIn(); }
                else if( token.value == ")" ) { --braceDepth; scope = scope.stepOut(); }
                else if( token.value == "{" ) { ++curlyBraceDepth; scope = scope.stepIn(); }
                else if( token.value == "}" ) { --curlyBraceDepth; scope = scope.stepOut(); }
                else if( token.value == "[" ) { ++squareBraceDepth; scope = scope.stepIn(); }
                else if( token.value == "]" ) { --squareBraceDepth; scope = scope.stepOut(); }
            }

            token.commaObserved = scope.wasCommaObserved();
            token.caseObserved  = scope.wasCaseObserved();
            token.scopeType     = scope.getScopeType();
            token.scopeSubType  = scope.getScopeSubType();
        });

        return tokens;
    }

    combineDuplicateStrings( tokens )
    {
        // Construct a table of strings and their number of uses
        let strings = {};

        tokens.forEach( function ( token, index )
        {
            if( token.type != "string" || token.scopeSubType == "enum" || token.value.length < 12 ) return;
            let lastLastLastToken = index-3 > 0 ? tokens[index-3] : null;
            if( lastLastLastToken != null && lastLastLastToken.value == "const" ) return;

            if( Object.keys( strings ).includes( token.value ) )
            {
                ++strings[token.value];
            }
            else
            {
                strings[token.value] = 1;
            }
        });

        // Construct new constant names and escaped values for each duplicated string and
        // insert them as constant values at the start of the token stream (global scope)
        let duplicateCount  = 0;
        let newTokens       = [];

        for( let string in strings )
        {
            if( strings[string] > 1 )
            {
                let value = "";

                for( let i = 0; i < string.length; ++i )
                {
                  // f( (i == 0 || i == string.length-1) && string[i] == '\'' ) { value += "\""; }
                    if( i != 0 && i != string.length-1 && string[i] == '"' ) { value += "\\\""; }
                    else { value += string[i]; }
                }

                let constantName = "S" + duplicateCount;

                strings[string] = constantName;

                newTokens.push( { type : "name", value : "const", lineNumber : duplicateCount, columnNumber : 0 });
                newTokens.push( { type : "name", value : constantName, lineNumber : duplicateCount, columnNumber : 7 });
                newTokens.push( { type : "punctuator", value : "=", lineNumber : duplicateCount, columnNumber : (8+constantName.length) });
                newTokens.push( { type : "string", value : value, lineNumber : duplicateCount, columnNumber : (10+constantName.length) });
                newTokens.push( { type : "punctuator", value : ";", lineNumber : duplicateCount, columnNumber : (11+constantName.length+value.length) });
                newTokens.push( { type : "newline", value : "\n", lineNumber : duplicateCount, columnNumber : (12+constantName.length+value.length) });

                ++duplicateCount;
            }
        }

        // Replace duplicate string values with references to their new constants
        tokens.forEach( function ( token, index )
        {
            if( token.type != "string" || token.scopeSubType == "enum" || token.value.length < 4 ) return;
            let lastLastLastToken = index-3 > 0 ? tokens[index-3] : null;
            if( lastLastLastToken != null && lastLastLastToken.value == "const" ) return;

            if( Object.keys( strings ).includes( token.value ) && typeof strings[token.value] != "number" )
            {
                token.value = strings[token.value];
                token.stringReplacement = true;

                // We need to substitue the following ':' for '=' if we're inside a Squirrel table
                // as JSON notation doesn't support constant references
                let nextToken = index+1 < tokens.length ? tokens[index+1] : null;
                
                if( nextToken != null && nextToken.value == ":" && nextToken.scopeType == "curlyBrace" &&
                    nextToken.commaObserved == true && nextToken.caseObserved == false )
                {
                    nextToken.value = "=";
                }

                // We need to sound the token in square braces if we're inside a Squirrel table
                // as it will use the the value literally otherwise
                if( nextToken != null && nextToken.value == "=" )
                {
                    token.value = "[" + token.value + "]";
                }
            }
        });

        // Combine tokens and revise line numbers
        tokens.forEach( function ( token ) { token.lineNumber += duplicateCount; } );
        tokens = newTokens.concat( tokens );
        
        return tokens;
    }

    rebuild( tokens, noNewLines = true )
    {
        let lastSymbols =
        {
            "+" : true, "-" : true, "*" : true, "\\" : true, "%" : true,
            "+=" : true, "-=" : true, "*=" : true, "\\=" : true, "%=" : true,
            "&&" : true, "||" : true, "!" : true, "=" : true,
            "==" : true, "!=" : true, "<=" : true, ">=" : true, "<=>" : true,
            "&" : true, "|" : true, "^" : true, "~" : true, ";" : true, "?" : true,
            ":" : true, "," : true, "[" : true,/* "]" : true,*/ "{" : true, "}" : true, "(" : true, "<-" : true, "else" : true
        };

        let nextSymbols =
        {
            "+" : true, "-" : true, "*" : true, "\\" : true, "%" : true,
            "+=" : true, "-=" : true, "*=" : true, "\\=" : true, "%=" : true,
            "&&" : true, "||" : true, "!" : true,
            "==" : true, "!=" : true, "<=" : true, ">=" : true, "<=>" : true,
            "&" : true, "|" : true, "^" : true, "~" : true, ";" : true, "." : true,
            ":" : true, "," : true, "[" : true, /*"]" : true,*/ "{" : true, "}" : true, "(" : true, ")" : true,
        };

        let statements =
        {
            "if" : true, "else" : true, "for" : true, "foreach" : true, "while" : true, "do" : true, "switch" : true,
            //"return" : true, "class" : true, "try" : true, "catch" : true, "throw" : true, "enum" : true
        }

        let result = "";
        let lastToken = "";

        var inStatementBrackets = false;
        var openBrackets = 0;

        tokens.forEach( function ( token, index )
        {
            let getToken = function ( index )
            {
                return index < tokens.length-1 ? tokens[index] : { type: "blank", value: "blank" };
            };

            let nextToken = getToken( index+1 );
        
            if( inStatementBrackets == true )
            {
                if( token.value == "(" ) { ++openBrackets; }
                else if( token.value == ")" ) { --openBrackets; }
        
                if( openBrackets == 0 ) { token.wasStatement = true; inStatementBrackets = false; }
            }

            // Determine if we're within the braces '( )' of a statement (if, for etc)        
            if( Object.keys(statements).includes(token.value) && nextToken.value == "(" ) { inStatementBrackets = true; }
            
            if( token.type == "newline" )
            {
                if( noNewLines == true )
                {
                    if( token.scopeType == "squareBrace" ||
                        Object.keys(lastSymbols).includes(lastToken.value) ||
                        (lastToken.value == ")" && lastToken.wasStatement == true) ||
                        Object.keys(nextSymbols).includes(nextToken.value) ||
                        lastToken.type == "newline" )
                    {
                        result += " ";
                    }
                    else
                    {
                        result += ";";
                    }
                }
                else
                {
                    result += "\n";
                }
            }
            else if( (token.type == "punctuator" && token.value == ".") || (lastToken.type == "punctuator" && lastToken.value == ".") )
            {
                result += token.value;
            }
            else if( Object.keys(token).includes("stringReplacement") )
            {
                if( nextToken.value == ":" && getToken(index+3).value == "," )
                {
                    nextToken.value = "=";
                }
        
                result += " " + token.value;
            }
            else
            {
                result += " " + token.value;
            }
        
            lastToken = token;
        });

        return result;
    }
}

export { Minimizer };