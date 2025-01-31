// Generated by BUCKLESCRIPT VERSION 5.0.6, PLEASE EDIT WITH CARE
'use strict';

var Curry = require("bs-platform/lib/js/curry.js");
var Async$AgdaMode = require("./Async.bs.js");
var Resource$AgdaMode = require("./Resource.bs.js");

function send(input, channel) {
  return Async$AgdaMode.thenOk((function (trigger) {
                  return Curry._1(trigger, input);
                }))(Curry._1(channel[/* acquire */0], /* () */0));
}

function recv(callback, channel) {
  return Curry._1(channel[/* supply */1], callback);
}

var make = Resource$AgdaMode.make;

exports.make = make;
exports.send = send;
exports.recv = recv;
/* Async-AgdaMode Not a pure module */
