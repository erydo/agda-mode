open Rebase;
open Fn;

open BsChai.Expect;
open! BsMocha.Mocha;
open! BsMocha.Promise;
open Js.Promise;

open Test__Util;

describe("View", () => {
  before_each(Package.deactivate >> then_(Package.activate));
  describe("when activating agda-mode", () =>
    it("should mount the panel at the bottom", () =>
      File.openAsset("Blank1.agda")
      |> then_(dispatch("agda-mode:load"))
      |> then_(getInstance)
      |> then_((instance: Instance.t) =>
           instance.view.onPanelActivationChange()
           |> Async.thenOk(
                fun
                | None => Async.reject()
                | Some(element) => Async.resolve(element),
              )
         )
      |> then_(result => {
           switch (result) {
           | Error(_) => BsMocha.Assert.fail("failed to activate the panel")
           | Ok(element) =>
             open Webapi.Dom;

             // the activated panel as class ".agda-mode"
             element
             |> Element.className
             |> Expect.expect
             |> Combos.End.to_be("agda-mode");

             let children =
               Atom.Workspace.getBottomPanels()
               |> Array.flatMap(
                    Atom.Views.getView
                    >> HtmlElement.childNodes
                    >> NodeList.toArray,
                  )
               |> Array.filterMap(Element.ofNode);

             // the `element` is the child of one of the panels
             Expect.expect(children) |> Combos.End.to_include(element);
           };
           resolve();
         })
    )
  );
});
