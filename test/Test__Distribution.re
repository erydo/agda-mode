open Rebase;
open Fn;

open BsMocha;
open! BsMocha.Mocha;
open! BsMocha.Promise;
open Js.Promise;
open Test__Util;

exception CannotReadPackageJson;

// bindings for git-branch
[@bs.module]
external branch: unit => Js.Promise.t(Js.null(string)) = "git-branch";

let readFile = N.Fs.readFile |> N.Util.promisify;
let readPackageJSONMain = () => {
  readFile(. "./package.json")
  |> then_(
       Node.Buffer.toString
       >> Js.Json.parseExn
       >> Js.Json.decodeObject
       >> Option.flatMap(obj => Js.Dict.get(obj, "main"))
       >> Option.flatMap(Js.Json.decodeString)
       >> Option.mapOr(resolve, reject(CannotReadPackageJson)),
     );
};

let onProd = callback =>
  branch()
  |> then_(x =>
       switch (Js.nullToOption(x)) {
       | None => callback()
       | Some("master") => callback()
       | _ => resolve(0)
       }
     );

let onDev = callback =>
  branch()
  |> then_(x =>
       switch (Js.nullToOption(x)) {
       | None => resolve(0)
       | Some("master") => resolve(0)
       | _ => callback()
       }
     );

describe("Distribution", () => {
  describe("when on the master branch", () => {
    it("has the production bundle ready", () =>
      onProd(() =>
        make((~resolve, ~reject) =>
          N.Fs.access(Path.file("lib/js/bundled.js"), err =>
            switch (Js.nullToOption(err)) {
            | None => resolve(. 0)
            | Some(e) => reject(. N.Exception(e))
            }
          )
        )
      )
    );

    it("should points to the production bundle", () =>
      onProd(() =>
        readPackageJSONMain()
        |> then_(path => {
             Assert.equal(path, "./lib/js/bundled.js");
             resolve(0);
           })
      )
    );
  });

  describe("when on the development branch", () =>
    it("should points to AgdaMode.bs", () =>
      onDev(() =>
        readPackageJSONMain()
        |> then_(path => {
             Assert.equal(path, "./lib/js/src/AgdaMode.bs");
             resolve(0);
           })
      )
    )
  );
});
