// Generated by BUCKLESCRIPT VERSION 5.0.6, PLEASE EDIT WITH CARE
'use strict';

var Fs = require("fs");
var Util = require("util");
var Curry = require("bs-platform/lib/js/curry.js");
var Rebase = require("@glennsl/rebase/lib/js/src/Rebase.bs.js");
var Js_dict = require("bs-platform/lib/js/js_dict.js");
var Js_json = require("bs-platform/lib/js/js_json.js");
var N$AgdaMode = require("../src/Node/N.bs.js");
var GitBranch = require("git-branch");
var Mocha$BsMocha = require("bs-mocha/lib/js/src/Mocha.bs.js");
var Caml_exceptions = require("bs-platform/lib/js/caml_exceptions.js");
var Promise$BsMocha = require("bs-mocha/lib/js/src/Promise.bs.js");
var Test__Util$AgdaMode = require("./Test__Util.bs.js");

var CannotReadPackageJson = Caml_exceptions.create("Test__Distribution-AgdaMode.CannotReadPackageJson");

var readFile = Util.promisify((function (prim, prim$1) {
        Fs.readFile(prim, prim$1);
        return /* () */0;
      }));

function readPackageJSONMain(param) {
  var partial_arg = Rebase.$$Option[/* flatMap */5];
  var partial_arg$1 = Rebase.$$Option[/* flatMap */5];
  var partial_arg$2 = Promise.reject(CannotReadPackageJson);
  var partial_arg$3 = Rebase.$$Option[/* mapOr */18];
  var partial_arg$4 = Curry._2(Rebase.Fn[/* >> */6], Curry._2(Rebase.Fn[/* >> */6], Curry._2(Rebase.Fn[/* >> */6], Curry._2(Rebase.Fn[/* >> */6], Curry._2(Rebase.Fn[/* >> */6], (function (prim) {
                          return prim.toString();
                        }), (function (prim) {
                          return JSON.parse(prim);
                        })), Js_json.decodeObject), (function (param) {
                  return partial_arg((function (obj) {
                                return Js_dict.get(obj, "main");
                              }), param);
                })), (function (param) {
              return partial_arg$1(Js_json.decodeString, param);
            })), (function (param) {
          return partial_arg$3((function (prim) {
                        return Promise.resolve(prim);
                      }), partial_arg$2, param);
        }));
  return readFile("./package.json").then(Curry.__1(partial_arg$4));
}

function onProd(callback) {
  return GitBranch().then((function (x) {
                if (x !== null && x !== "master") {
                  return Promise.resolve(0);
                } else {
                  return Curry._1(callback, /* () */0);
                }
              }));
}

function onDev(callback) {
  return GitBranch().then((function (x) {
                if (x !== null && x !== "master") {
                  return Curry._1(callback, /* () */0);
                } else {
                  return Promise.resolve(0);
                }
              }));
}

Mocha$BsMocha.describe("Distribution")(undefined, undefined, undefined, (function (param) {
        Mocha$BsMocha.describe("when on the master branch")(undefined, undefined, undefined, (function (param) {
                Promise$BsMocha.it("has the production bundle ready")(undefined, undefined, undefined, (function (param) {
                        return onProd((function (param) {
                                      return new Promise((function (resolve, reject) {
                                                    Fs.access(Test__Util$AgdaMode.Path[/* file */1]("lib/js/bundled.js"), (function (err) {
                                                            if (err !== null) {
                                                              return reject([
                                                                          N$AgdaMode.Exception,
                                                                          err
                                                                        ]);
                                                            } else {
                                                              return resolve(0);
                                                            }
                                                          }));
                                                    return /* () */0;
                                                  }));
                                    }));
                      }));
                return Promise$BsMocha.it("should points to the production bundle")(undefined, undefined, undefined, (function (param) {
                              return onProd((function (param) {
                                            return readPackageJSONMain(/* () */0).then((function (path) {
                                                          Test__Util$AgdaMode.Assert[/* equal */0](undefined, path, "./lib/js/bundled.js");
                                                          return Promise.resolve(0);
                                                        }));
                                          }));
                            }));
              }));
        return Mocha$BsMocha.describe("when on the development branch")(undefined, undefined, undefined, (function (param) {
                      return Promise$BsMocha.it("should points to AgdaMode.bs")(undefined, undefined, undefined, (function (param) {
                                    return onDev((function (param) {
                                                  return readPackageJSONMain(/* () */0).then((function (path) {
                                                                Test__Util$AgdaMode.Assert[/* equal */0](undefined, path, "./lib/js/src/AgdaMode.bs");
                                                                return Promise.resolve(0);
                                                              }));
                                                }));
                                  }));
                    }));
      }));

exports.CannotReadPackageJson = CannotReadPackageJson;
exports.readFile = readFile;
exports.readPackageJSONMain = readPackageJSONMain;
exports.onProd = onProd;
exports.onDev = onDev;
/* readFile Not a pure module */
