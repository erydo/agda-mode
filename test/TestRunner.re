type runner;
type mocha;
type options = {. "testSuffixes": array(string)};

[@bs.module "atom-mocha-test-runner"]
external createRunner: (options, mocha => unit) => runner = "createRunner";

// optional options to customize the runner
let extraOptions = {"testSuffixes": [|"Test.bs.js"|]};

// If provided, atom-mocha-test-runner will pass the mocha instance
// to this function, so you can do whatever you"d like to it.
let optionalConfigurationFunction = _mocha => ();
let runner = createRunner(extraOptions, optionalConfigurationFunction);
[%raw "module.exports = runner"];
