import { Parser, seq, alt, takeWhile, sepBy1, succeed, all,
     digits, string, regex
    } from "parsimmon";
import { trimBeforeAndSkip, spaces, token } from "./combinator";
var { Point, Range } = require('atom');
import { View, Error, Suggestion, Location } from "../types";
import { normalize } from "path";


////////////////////////////////////////////////////////////////////////////////
//  Error
////////////////////////////////////////////////////////////////////////////////

const singleLineRange: Parser<[Range, Boolean]> = seq(
        digits,
        string(","),
        digits,
        string("-"),
        digits
    ).map((result) => {
        const row = parseInt(result[0]) - 1;
        const start = new Point(row, parseInt(result[2]) - 1);
        const end   = new Point(row, parseInt(result[4]) - 1);
        return <[Range, Boolean]>[new Range(start, end), true];
    });

const multiLineRange: Parser<[Range, Boolean]> = seq(
        digits,
        string(","),
        digits,
        string("-"),
        digits,
        string(","),
        digits
    ).map((result) => {
        const start = new Point(parseInt(result[0]) - 1, parseInt(result[2]) - 1);
        const end   = new Point(parseInt(result[4]) - 1, parseInt(result[6]) - 1);
        return <[Range, Boolean]>[new Range(start, end), false];
    });

const range = alt(multiLineRange, singleLineRange).skip(spaces);
const location: Parser<Location> = seq(
        takeWhile((c) => c !== ":"),
        string(":"),
        range
    ).map((result) => {
        return {
            path: normalize(result[0]),
            range: result[2][0],
            isSameLine: result[2][1]
        };
    }).skip(spaces);

const didYouMean: Parser<Suggestion> = alt(seq(
        token("(did you mean"),
        sepBy1(regex(/'.*'/).skip(spaces), token("or")),
        token("?)")
    ), succeed([[], []])).map((result) => {
        return result[1].map((s) => s.substr(1, s.length - 2)); // remove single quotes
    }).skip(spaces);

const notInScope: Parser<Error.NotInScope> = seq(
        location,
        token("Not in scope:").then(trimBeforeAndSkip("at")).skip(location),
        didYouMean,
        all
    ).map((result) => {
        return <Error.NotInScope>{
            kind: "NotInScope",
            expr: result[1],
            location: result[0],
            suggestion: result[2]
        }
    });

const typeMismatch: Parser<Error.TypeMismatch> = seq(
        location,
        alt(trimBeforeAndSkip("!=<"), trimBeforeAndSkip("=<"), trimBeforeAndSkip("!=")),
        trimBeforeAndSkip("of type"),
        trimBeforeAndSkip("when checking that the expression"),
        trimBeforeAndSkip("has type"),
        all
    ).map((result) => {
        return <Error.TypeMismatch>{
            kind: "TypeMismatch",
            actual: result[1],
            expected: result[2],
            expectedType: result[3],
            expr: result[4],
            exprType: result[5],
            location: result[0]
        };
    });

const definitionTypeMismatch: Parser<Error.DefinitionTypeMismatch> = seq(
        location,
        alt(trimBeforeAndSkip("!=<"), trimBeforeAndSkip("=<"), trimBeforeAndSkip("!=")),
        trimBeforeAndSkip("of type"),
        trimBeforeAndSkip("when checking the definition of"),
        all
    ).map((result) => {
        return <Error.DefinitionTypeMismatch>{
            kind: "DefinitionTypeMismatch",
            actual: result[1],
            expected: result[2],
            expectedType: result[3],
            expr: result[4],
            location: result[0]
        };
    });

const badConstructor: Parser<Error.BadConstructor> = seq(
        location,
        token("The constructor").then(trimBeforeAndSkip("does not construct an element of")),
        trimBeforeAndSkip("when checking that the expression"),
        trimBeforeAndSkip("has type"),
        all
    ).map((result) => {
        return <Error.BadConstructor>{
            kind: "BadConstructor",
            location: result[0],
            constructor: result[1],
            constructorType: result[2],
            expr: result[3],
            exprType: result[4]
        };
    });

const rhsOmitted: Parser<Error.RHSOmitted> =  seq(
        location,
        token("The right-hand side can only be omitted if there is an absurd"),
        token("pattern, () or {}, in the left-hand side."),
        token("when checking that the clause"),
        trimBeforeAndSkip("has type"),
        all
    ).map((result) => {
        return <Error.RHSOmitted>{
            kind: "RHSOmitted",
            location: result[0],
            expr: result[4],
            exprType: result[5]
        }
    });

const missingType: Parser<Error.MissingType> =  seq(
        location,
        token("Missing type signature for left hand side"),
        trimBeforeAndSkip("when scope checking the declaration"),
        all
    ).map((result) => {
        return <Error.MissingType>{
            kind: "MissingType",
            location: result[0],
            expr: result[2],
            decl: result[3]
        }
    });

const multipleDefinition: Parser<Error.MultipleDefinition> =  seq(
        location,
        token("Multiple definitions of"),
        trimBeforeAndSkip(". Previous definition at"),
        location,
        token("when scope checking the declaration"),
        trimBeforeAndSkip(":"),
        all
    ).map((result) => {
        return <Error.MultipleDefinition>{
            kind: "MultipleDefinition",
            location: result[0],
            locationPrev: result[3],
            expr: result[2],
            decl: result[5],
            declType: result[6]
        }
    });


const missingDefinition: Parser<Error.MissingDefinition> =  seq(
        location,
        token("Missing definition for").then(all)
    ).map((result) => {
        return <Error.MissingDefinition>{
            kind: "MissingDefinition",
            location: result[0],
            expr: result[1]
        }
    });

const termination: Parser<Error.Termination> =  seq(
        location,
        token("Termination checking failed for the following functions:"),
        trimBeforeAndSkip("Problematic calls:"),
        seq(
            trimBeforeAndSkip("(at"),
            location.skip(token(")"))
        ).map((result) => {
            return {
                expr: result[0],
                location: result[1]
            }
        }).atLeast(1)
    ).map((result) => {
        return <Error.Termination>{
            kind: "Termination",
            location: result[0],
            expr: result[2],
            calls: result[3]
        }
    });

const constructorTarget: Parser<Error.ConstructorTarget> =  seq(
        location,
        token("The target of a constructor must be the datatype applied to its"),
        token("parameters,").then(trimBeforeAndSkip("isn't")),
        token("when checking the constructor").then(trimBeforeAndSkip("in the declaration of")),
        all
    ).map((result) => {
        return <Error.ConstructorTarget>{
            kind: "ConstructorTarget",
            location: result[0],
            expr: result[2],
            ctor: result[3],
            decl: result[4]
        }
    });


const functionType: Parser<Error.FunctionType> =  seq(
        location,
        trimBeforeAndSkip("should be a function type, but it isn't"),
        token("when checking that").then(trimBeforeAndSkip("is a valid argument to a function of type")),
        all
    ).map((result) => {
        return <Error.FunctionType>{
            kind: "FunctionType",
            location: result[0],
            expr: result[2],
            exprType: result[1]
        }
    });

const moduleMismatch: Parser<Error.ModuleMismatch> =  seq(
        token("You tried to load").then(trimBeforeAndSkip("which defines")),
        token("the module").then(trimBeforeAndSkip(". However, according to the include path this module")),
        token("should be defined in").then(all)
    ).map((result) => {
        return <Error.ModuleMismatch>{
            kind: "ModuleMismatch",
            wrongPath: result[0],
            rightPath: result[2],
            moduleName: result[1]
        }
    });

const parse: Parser<Error.Parse> =  seq(
        location,
        trimBeforeAndSkip(": ").then(trimBeforeAndSkip("..."))
    ).map((result) => {
        const i = (<string>result[1]).indexOf("\n");
        return <Error.Parse>{
            kind: "Parse",
            location: result[0],
            message: (<string>result[1]).substring(0, i),
            expr: (<string>result[1]).substring(i + 1)
        }
    });


const caseSingleHole: Parser<Error.CaseSingleHole> =  seq(
    location,
    token("Right hand side must be a single hole when making a case").then(token("distinction")),
    token("when checking that the expression"),
    trimBeforeAndSkip("has type"),
    all
).map((result) => {
    return <Error.CaseSingleHole>{
        kind: "CaseSingleHole",
        location: result[0],
        expr: result[3],
        exprType: result[4]
    }
});

const patternMatchOnNonDatatype: Parser<Error.PatternMatchOnNonDatatype> =  seq(
    location,
    token("Cannot pattern match on non-datatype").then(trimBeforeAndSkip("when checking that the expression")),
    trimBeforeAndSkip("has type"),
    all
).map((result) => {
    return <Error.PatternMatchOnNonDatatype>{
        kind: "PatternMatchOnNonDatatype",
        location: result[0],
        nonDatatype: result[1],
        expr: result[2],
        exprType: result[3]
    }
});

const unparsed: Parser<Error.Unparsed> = all.map((result) => {
    return <Error.Unparsed>{
        kind: "Unparsed",
        input: result
    }
});

const errorParser: Parser<Error> = alt(
    notInScope,
    typeMismatch,
    definitionTypeMismatch,
    badConstructor,
    rhsOmitted,
    missingType,
    multipleDefinition,
    missingDefinition,
    termination,
    constructorTarget,
    functionType,
    moduleMismatch,
    parse,
    caseSingleHole,
    patternMatchOnNonDatatype,
    unparsed
);

function parseError(input: string): Error {
    return errorParser.parse(input).value;
}

export {
    parseError
}
