// Generated by BUCKLESCRIPT VERSION 5.0.6, PLEASE EDIT WITH CARE
'use strict';

var Chai = require("chai");
var Curry = require("bs-platform/lib/js/curry.js");
var Rebase = require("@glennsl/rebase/lib/js/src/Rebase.bs.js");
var Expect$BsChai = require("bs-chai/lib/js/src/Expect.bs.js");
var Mocha$BsMocha = require("bs-mocha/lib/js/src/Mocha.bs.js");
var Promise$BsMocha = require("bs-mocha/lib/js/src/Promise.bs.js");
var Instance$AgdaMode = require("../src/Instance.bs.js");
var Test__Util$AgdaMode = require("./Test__Util.bs.js");
var Webapi__Dom__Element = require("bs-webapi/lib/js/src/Webapi/Webapi__Dom/Webapi__Dom__Element.js");

Mocha$BsMocha.describe("View")(undefined, undefined, undefined, (function (param) {
        Mocha$BsMocha.describe("Activation/deactivation")(undefined, undefined, undefined, (function (param) {
                Mocha$BsMocha.describe("when activating agda-mode")(undefined, undefined, undefined, (function (param) {
                        Promise$BsMocha.after_each(undefined)(undefined, undefined, undefined, Test__Util$AgdaMode.Package[/* cleanup */4]);
                        Promise$BsMocha.it("should mount `article.agda-mode-panel-container` at the bottom")(undefined, undefined, undefined, (function (param) {
                                return Test__Util$AgdaMode.openAndLoad("Blank1.agda").then((function (param) {
                                              var children = Rebase.$$Array[/* filterMap */23](Webapi__Dom__Element.ofNode, Rebase.$$Array[/* flatMap */5](Curry._2(Rebase.Fn[/* >> */6], Curry._2(Rebase.Fn[/* >> */6], (function (prim) {
                                                                  return atom.views.getView(prim);
                                                                }), (function (prim) {
                                                                  return prim.childNodes;
                                                                })), (function (prim) {
                                                              return Array.prototype.slice.call(prim);
                                                            })), atom.workspace.getBottomPanels()));
                                              Curry._3(Expect$BsChai.Combos[/* End */34][/* to_include */4], undefined, "agda-mode-panel-container", Chai.expect(Rebase.$$Array[/* map */0]((function (prim) {
                                                              return prim.className;
                                                            }), children)));
                                              return Promise.resolve(/* () */0);
                                            }));
                              }));
                        return Promise$BsMocha.it("should mount `section#agda-mode:xxx` inside `article.agda-mode-panel-container`")(undefined, undefined, undefined, (function (param) {
                                      return Test__Util$AgdaMode.openAndLoad("Blank1.agda").then((function (instance) {
                                                    var panels = Rebase.$$Array[/* filter */10]((function (elem) {
                                                            return elem.className === "agda-mode-panel-container";
                                                          }), Rebase.$$Array[/* filterMap */23](Webapi__Dom__Element.ofNode, Rebase.$$Array[/* flatMap */5](Curry._2(Rebase.Fn[/* >> */6], Curry._2(Rebase.Fn[/* >> */6], (function (prim) {
                                                                            return atom.views.getView(prim);
                                                                          }), (function (prim) {
                                                                            return prim.childNodes;
                                                                          })), (function (prim) {
                                                                        return Array.prototype.slice.call(prim);
                                                                      })), atom.workspace.getBottomPanels())));
                                                    var targetID = "agda-mode:" + Instance$AgdaMode.getID(instance);
                                                    Test__Util$AgdaMode.Assert[/* equal */0](undefined, true, Rebase.$$Array[/* map */0]((function (prim) {
                                                                  return prim.id;
                                                                }), Rebase.$$Array[/* filterMap */23](Webapi__Dom__Element.ofNode, Rebase.$$Array[/* flatMap */5](Curry._2(Rebase.Fn[/* >> */6], (function (prim) {
                                                                              return prim.childNodes;
                                                                            }), (function (prim) {
                                                                              return Array.prototype.slice.call(prim);
                                                                            })), panels))).includes(targetID));
                                                    return Promise.resolve(/* () */0);
                                                  }));
                                    }));
                      }));
                return Mocha$BsMocha.describe("when closing the editor")(undefined, undefined, undefined, (function (param) {
                              Promise$BsMocha.after_each(undefined)(undefined, undefined, undefined, Test__Util$AgdaMode.Package[/* cleanup */4]);
                              Promise$BsMocha.it("should unmount `section#agda-mode:xxx` from `article.agda-mode-panel-container` when docker at bottom")(undefined, undefined, undefined, (function (param) {
                                      return Test__Util$AgdaMode.openAndLoad("Temp.agda").then(Test__Util$AgdaMode.close).then((function (param) {
                                                    Test__Util$AgdaMode.Assert[/* equal */0](undefined, 0, Rebase.$$Array[/* length */16](Rebase.$$Array[/* flatMap */5](Test__Util$AgdaMode.View[/* childHtmlElements */0], Test__Util$AgdaMode.View[/* getPanelContainers */3](/* () */0))));
                                                    return Promise.resolve(/* () */0);
                                                  }));
                                    }));
                              return Promise$BsMocha.it("should close the tab when docked at pane")(undefined, undefined, undefined, (function (param) {
                                            return Test__Util$AgdaMode.openAndLoad("Temp.agda").then((function (param) {
                                                              return Test__Util$AgdaMode.dispatch("agda-mode:toggle-docking", param);
                                                            })).then(Test__Util$AgdaMode.close).then((function (param) {
                                                          Test__Util$AgdaMode.Assert[/* equal */0](undefined, 0, Rebase.$$Array[/* length */16](Rebase.$$Array[/* flatMap */5](Test__Util$AgdaMode.View[/* childHtmlElements */0], Test__Util$AgdaMode.View[/* getPanelContainers */3](/* () */0))));
                                                          return Promise.resolve(/* () */0);
                                                        }));
                                          }));
                            }));
              }));
        return Mocha$BsMocha.describe("Docking")(undefined, undefined, undefined, (function (param) {
                      Mocha$BsMocha.describe("when toggle docking")(undefined, undefined, undefined, (function (param) {
                              Promise$BsMocha.after_each(undefined)(undefined, undefined, undefined, Test__Util$AgdaMode.Package[/* cleanup */4]);
                              return Promise$BsMocha.it("should open a new tab")(undefined, undefined, undefined, (function (param) {
                                            return Test__Util$AgdaMode.openAndLoad("Blank1.agda").then((function (param) {
                                                            return Test__Util$AgdaMode.dispatch("agda-mode:toggle-docking", param);
                                                          })).then((function (param) {
                                                          Test__Util$AgdaMode.Assert[/* equal */0](undefined, true, Rebase.$$Array[/* map */0]((function (prim) {
                                                                        return prim.className;
                                                                      }), Test__Util$AgdaMode.View[/* getPanelContainersAtPanes */2](/* () */0)).includes("agda-mode-panel-container"));
                                                          return Promise.resolve(/* () */0);
                                                        }));
                                          }));
                            }));
                      return Mocha$BsMocha.describe("when toggle docking again")(undefined, undefined, undefined, (function (param) {
                                    Promise$BsMocha.after_each(undefined)(undefined, undefined, undefined, Test__Util$AgdaMode.Package[/* cleanup */4]);
                                    Promise$BsMocha.it("should close the opened tab")(undefined, undefined, undefined, (function (param) {
                                            return Test__Util$AgdaMode.openAndLoad("Blank1.agda").then((function (param) {
                                                              return Test__Util$AgdaMode.dispatch("agda-mode:toggle-docking", param);
                                                            })).then((function (param) {
                                                            return Test__Util$AgdaMode.dispatch("agda-mode:toggle-docking", param);
                                                          })).then((function (param) {
                                                          Test__Util$AgdaMode.Assert[/* equal */0](undefined, false, Rebase.$$Array[/* map */0]((function (prim) {
                                                                        return prim.className;
                                                                      }), Test__Util$AgdaMode.View[/* getPanelContainersAtPanes */2](/* () */0)).includes("agda-mode-panel-container"));
                                                          return Promise.resolve(/* () */0);
                                                        }));
                                          }));
                                    return Promise$BsMocha.it("should dock the panel back to the existing bottom panel container")(undefined, undefined, undefined, (function (param) {
                                                  return Test__Util$AgdaMode.openAndLoad("Blank1.agda").then((function (param) {
                                                                    return Test__Util$AgdaMode.dispatch("agda-mode:toggle-docking", param);
                                                                  })).then((function (param) {
                                                                  return Test__Util$AgdaMode.dispatch("agda-mode:toggle-docking", param);
                                                                })).then((function (param) {
                                                                Test__Util$AgdaMode.Assert[/* equal */0](undefined, 1, Rebase.$$Array[/* length */16](Test__Util$AgdaMode.View[/* getPanelContainersAtBottom */1](/* () */0)));
                                                                return Promise.resolve(/* () */0);
                                                              }));
                                                }));
                                  }));
                    }));
      }));

/*  Not a pure module */
