open Rebase;
open Async;

open Instance__Type;

module Goals = Instance__Goals;
module Views = Instance__Goals;
module Highlightings = Instance__Highlightings;
module Connections = Instance__Connections;
module TextEditors = Instance__TextEditors;

open TextEditors;

let handleCommandError = instance =>
  thenError((error: Command.error) => {
    Command.
      /*  */
      (
        switch (error) {
        | ParseError(errors) =>
          let intro =
            string_of_int(Array.length(errors))
            ++ " parse errors, here are the original texts:\n\n";
          let message = errors |> List.fromArray |> String.joinWith("\n\n");

          instance.view
          |> View.Handles.display(
               "Parse Errors",
               Type.View.Header.Error,
               Emacs(PlainText(intro ++ message)),
             );
        | Connection(_connErr) =>
          instance.view
          |> View.Handles.display(
               "Connection-related Error",
               Type.View.Header.Error,
               Emacs(PlainText("")),
             )
        | Cancelled =>
          instance.view
          |> View.Handles.display(
               "Query Cancelled",
               Type.View.Header.Error,
               Emacs(PlainText("")),
             )
        | GoalNotIndexed =>
          instance.view
          |> View.Handles.display(
               "Goal not indexed",
               Type.View.Header.Error,
               Emacs(PlainText("Please reload to re-index the goal")),
             )
        | OutOfGoal =>
          instance.view
          |> View.Handles.display(
               "Out of goal",
               Type.View.Header.Error,
               Emacs(PlainText("Please place the cursor in a goal")),
             )
        }
      )
    |> ignore;
    resolve();
  });

/* Primitive Command => Remote Command */
let rec handleLocalCommand =
        (command: Command.Primitive.t, instance)
        : Async.t(option(Command.Remote.t), Command.error) => {
  let buff = (command, instance) => {
    Connections.get(instance)
    |> mapOk(connection =>
         Some(
           {
             connection,
             filepath: instance.editors.source |> Atom.TextEditor.getPath,
             command,
           }: Command.Remote.t,
         )
       )
    |> mapError(_ => Command.Cancelled);
  };
  switch (command) {
  | Load =>
    /* force save before load */
    instance.editors.source
    |> Atom.TextEditor.save
    |> fromPromise
    |> mapError(_ => Command.Cancelled)
    |> thenOk(() => {
         instance.loaded = true;
         instance |> buff(Load);
       })
  | Abort => instance |> buff(Abort)
  | Quit =>
    Connections.disconnect(instance);
    instance |> Goals.destroyAll;
    instance |> Highlightings.destroyAll;
    instance.loaded = false;
    resolve(None);
  | Restart =>
    Connections.disconnect(instance);
    instance |> buff(Load);
  | Compile => instance |> buff(Compile)
  | ToggleDisplayOfImplicitArguments =>
    instance |> buff(ToggleDisplayOfImplicitArguments)
  | SolveConstraints => instance |> buff(SolveConstraints)
  | ShowConstraints => instance |> buff(ShowConstraints)
  | ShowGoals => instance |> buff(ShowGoals)
  | NextGoal =>
    let nextGoal = ref(None);
    let cursor =
      instance.editors.source |> Atom.TextEditor.getCursorBufferPosition;
    let positions =
      instance.goals
      |> Array.map(goal =>
           Atom.Point.translate(
             Atom.Point.make(0, 3),
             Atom.Range.start(goal.Goal.range),
           )
         );
    /* assign the next goal position */
    positions
    |> Array.forEach(position =>
         if (Atom.Point.isGreaterThan(cursor, position) && nextGoal^ === None) {
           nextGoal := Some(position);
         }
       );

    /* if no goal ahead of cursor, then loop back */
    if (nextGoal^ === None) {
      nextGoal := positions[0];
    };

    /* jump */
    nextGoal^
    |> Option.forEach(position =>
         instance.editors.source
         |> Atom.TextEditor.setCursorBufferPosition(position)
       );
    resolve(None);
  | PreviousGoal =>
    let previousGoal = ref(None);
    let cursor =
      instance.editors.source |> Atom.TextEditor.getCursorBufferPosition;
    let positions =
      instance.goals
      |> Array.map(goal =>
           Atom.Point.translate(
             Atom.Point.make(0, 3),
             Atom.Range.start(goal.Goal.range),
           )
         );

    /* assign the previous goal position */
    positions
    |> Array.forEach(position =>
         if (Atom.Point.isLessThan(cursor, position) && previousGoal^ === None) {
           previousGoal := Some(position);
         }
       );

    /* loop back if this is already the first goal */
    if (previousGoal^ === None) {
      previousGoal := positions[Array.length(positions) - 1];
    };

    /* jump */
    previousGoal^
    |> Option.forEach(position =>
         instance.editors.source
         |> Atom.TextEditor.setCursorBufferPosition(position)
       );
    resolve(None);

  | ToggleDocking =>
    instance.view |> View.Handles.toggleDocking |> ignore;
    resolve(None);
  | Give =>
    instance
    |> getPointedGoal
    |> thenOk(getGoalIndex)
    |> thenOk(((goal, index)) =>
         if (Goal.isEmpty(goal)) {
           instance.view
           |> View.Handles.inquire("Give", "expression to give:", "")
           |> thenOk(result => {
                goal |> Goal.setContent(result) |> ignore;
                instance |> buff(Give(goal, index));
              });
         } else {
           instance |> buff(Give(goal, index));
         }
       )

  | WhyInScope =>
    let selectedText =
      instance.editors.source |> Atom.TextEditor.getSelectedText;
    if (String.isEmpty(selectedText)) {
      instance.view
      |> View.Handles.inquire("Scope info", "name:", "")
      |> thenOk(expr =>
           instance
           |> getPointedGoal
           |> thenOk(getGoalIndex)
           |> thenOk(((_, index)) =>
                instance |> buff(WhyInScope(expr, index))
              )
         );
    } else {
      /* global */
      instance |> buff(WhyInScopeGlobal(selectedText));
    };

  | SearchAbout(normalization) =>
    instance.view
    |> View.Handles.inquire(
         "Searching through definitions ["
         ++ Command.Normalization.of_string(normalization)
         ++ "]",
         "expression to infer:",
         "",
       )
    |> thenOk(expr => instance |> buff(SearchAbout(normalization, expr)))

  | InferType(normalization) =>
    instance
    |> getPointedGoal
    |> thenOk(getGoalIndex)
    /* goal-specific */
    |> thenOk(((goal, index)) =>
         if (Goal.isEmpty(goal)) {
           instance.view
           |> View.Handles.inquire(
                "Infer type ["
                ++ Command.Normalization.of_string(normalization)
                ++ "]",
                "expression to infer:",
                "",
              )
           |> thenOk(expr =>
                instance |> buff(InferType(normalization, expr, index))
              );
         } else {
           instance |> buff(Give(goal, index));
         }
       )
    /* global  */
    |> handleOutOfGoal(_ =>
         instance.view
         |> View.Handles.inquire(
              "Infer type ["
              ++ Command.Normalization.of_string(normalization)
              ++ "]",
              "expression to infer:",
              "",
            )
         |> thenOk(expr =>
              instance |> buff(InferTypeGlobal(normalization, expr))
            )
       )

  | ModuleContents(normalization) =>
    instance.view
    |> View.Handles.inquire(
         "Module contents ["
         ++ Command.Normalization.of_string(normalization)
         ++ "]",
         "module name:",
         "",
       )
    |> thenOk(expr =>
         instance
         |> getPointedGoal
         |> thenOk(getGoalIndex)
         |> thenOk(((_, index)) =>
              instance |> buff(ModuleContents(normalization, expr, index))
            )
         |> handleOutOfGoal(_ =>
              instance |> buff(ModuleContentsGlobal(normalization, expr))
            )
       )

  | ComputeNormalForm(computeMode) =>
    instance
    |> getPointedGoal
    |> thenOk(getGoalIndex)
    |> thenOk(((goal, index)) =>
         if (Goal.isEmpty(goal)) {
           instance.view
           |> View.Handles.inquire(
                "Compute normal form",
                "expression to normalize:",
                "",
              )
           |> thenOk(expr =>
                instance |> buff(ComputeNormalForm(computeMode, expr, index))
              );
         } else {
           let expr = Goal.getContent(goal);
           instance |> buff(ComputeNormalForm(computeMode, expr, index));
         }
       )
    |> handleOutOfGoal(_ =>
         instance.view
         |> View.Handles.inquire(
              "Compute normal form",
              "expression to normalize:",
              "",
            )
         |> thenOk(expr =>
              instance |> buff(ComputeNormalFormGlobal(computeMode, expr))
            )
       )

  | Refine =>
    instance
    |> getPointedGoal
    |> thenOk(getGoalIndex)
    |> thenOk(((goal, index)) => instance |> buff(Refine(goal, index)))

  | Auto =>
    instance
    |> getPointedGoal
    |> thenOk(getGoalIndex)
    |> thenOk(((goal, index)) => instance |> buff(Refine(goal, index)))

  | Case =>
    instance
    |> getPointedGoal
    |> thenOk(getGoalIndex)
    |> thenOk(((goal, index)) =>
         if (Goal.isEmpty(goal)) {
           instance.view
           |> View.Handles.inquire("Case", "expression to case:", "")
           |> thenOk(result => {
                goal |> Goal.setContent(result) |> ignore;
                instance |> buff(Case(goal, index));
              });
         } else {
           instance |> buff(Case(goal, index));
         }
       )

  | GoalType(normalization) =>
    instance
    |> getPointedGoal
    |> thenOk(getGoalIndex)
    |> thenOk(((_, index)) =>
         instance |> buff(GoalType(normalization, index))
       )
  | Context(normalization) =>
    instance
    |> getPointedGoal
    |> thenOk(getGoalIndex)
    |> thenOk(((_, index)) =>
         instance |> buff(Context(normalization, index))
       )
  | GoalTypeAndContext(normalization) =>
    instance
    |> getPointedGoal
    |> thenOk(getGoalIndex)
    |> thenOk(((_, index)) =>
         instance |> buff(GoalTypeAndContext(normalization, index))
       )

  | GoalTypeAndInferredType(normalization) =>
    instance
    |> getPointedGoal
    |> thenOk(getGoalIndex)
    |> thenOk(((goal, index)) =>
         instance
         |> buff(GoalTypeAndInferredType(normalization, goal, index))
       )

  | InputSymbol(symbol) =>
    let enabled = Atom.Environment.Config.get("agda-mode.inputMethod");
    if (enabled) {
      switch (symbol) {
      | Ordinary =>
        instance.view.activatePanel |> Event.emitOk(true);
        instance.view.activateInputMethod |> Event.emitOk(true);
      | CurlyBracket =>
        instance.view.interceptAndInsertKey |> Event.emitOk("{")
      | Bracket => instance.view.interceptAndInsertKey |> Event.emitOk("[")
      | Parenthesis =>
        instance.view.interceptAndInsertKey |> Event.emitOk("(")
      | DoubleQuote =>
        instance.view.interceptAndInsertKey |> Event.emitOk("\"")
      | SingleQuote =>
        instance.view.interceptAndInsertKey |> Event.emitOk("'")
      | BackQuote => instance.view.interceptAndInsertKey |> Event.emitOk("`")
      };
      ();
    } else {
      instance.editors
      |> Editors.Focus.get
      |> Atom.TextEditor.insertText("\\")
      |> ignore;
    };
    resolve(None);
  | Jump(range) =>
    let filePath = instance.editors.source |> Atom.TextEditor.getPath;
    let shouldJump =
      switch (range) {
      | NoRange => false
      | Range(None, _) => true
      | Range(Some(path), _) => path == filePath
      };
    if (shouldJump) {
      /* Js.log(range); */
      let ranges = Type.Location.Range.toAtomRanges(range);
      if (ranges[0] |> Option.isSome) {
        Js.Global.setTimeout(
          _ =>
            instance.editors.source
            |> Atom.TextEditor.setSelectedBufferRanges(ranges),
          0,
        )
        |> ignore;
      };
    };
    resolve(None);
  | GotoDefinition =>
    if (instance.loaded) {
      let name =
        instance |> recoverCursor(() => getSelectedTextNode(instance));

      instance
      |> getPointedGoal
      |> thenOk(getGoalIndex)
      |> thenOk(((_, index)) =>
           instance |> buff(GotoDefinition(name, index))
         )
      |> handleOutOfGoal(_ => instance |> buff(GotoDefinitionGlobal(name)));
    } else {
      /* dispatch again if not already loaded  */
      instance
      |> dispatch(Command.Primitive.Load)
      |> handleCommandError(instance)
      |> thenOk(_ =>
           instance |> handleLocalCommand(Command.Primitive.GotoDefinition)
         );
    }
  | _ => instance |> buff(Load)
  };
}
and handleResponse =
    (instance: t, response: Response.t): Async.t(unit, Command.error) => {
  let textEditor = instance.editors.source;
  let filePath = textEditor |> Atom.TextEditor.getPath;
  let textBuffer = textEditor |> Atom.TextEditor.getBuffer;
  switch (response) {
  | HighlightingInfoDirect(_remove, annotations) =>
    annotations
    |> Array.filter(Highlighting.Annotation.shouldHighlight)
    |> Array.forEach(annotation => instance |> Highlightings.add(annotation));
    resolve();
  | HighlightingInfoIndirect(filepath) =>
    instance
    |> Highlightings.addFromFile(filepath)
    |> mapOk(() => N.Fs.unlink(filepath, _ => ()))
    |> mapError(_ => Command.Cancelled)
  | Status(displayImplicit, checked) =>
    if (displayImplicit || checked) {
      instance.view
      |> View.Handles.display(
           "Status",
           Type.View.Header.PlainText,
           Emacs(
             PlainText(
               "Typechecked: "
               ++ string_of_bool(checked)
               ++ "\nDisplay implicit arguments: "
               ++ string_of_bool(displayImplicit),
             ),
           ),
         )
      |> ignore;
    };
    resolve();
  | JumpToError(targetFilePath, index) =>
    if (targetFilePath == filePath) {
      let point =
        textBuffer |> Atom.TextBuffer.positionForCharacterIndex(index - 1);
      Js.Global.setTimeout(
        _ => Atom.TextEditor.setCursorBufferPosition(point, textEditor),
        0,
      )
      |> ignore;
    };
    resolve();
  | InteractionPoints(indices) =>
    instance |> Goals.instantiateAll(indices);
    resolve();
  | GiveAction(index, give) =>
    switch (Goals.find(index, instance)) {
    | None =>
      Js.log("error: cannot find goal #" ++ string_of_int(index));
      resolve();
    | Some(goal) =>
      switch (give) {
      | Paren =>
        let content = Goal.getContent(goal);
        Goal.setContent("(" ++ content ++ ")", goal) |> ignore;
      | NoParen => () /* do nothing */
      | String(content) =>
        Goal.setContent(
          content |> Js.String.replaceByRe([%re "/\\\\n/g"], "\n"),
          goal,
        )
        |> ignore
      };
      Goal.removeBoundary(goal);
      Goal.destroy(goal);
      resolve();
    }
  | MakeCase(makeCaseType, lines) =>
    let pointed = Editors.pointingAt(instance.goals, instance.editors);
    switch (pointed) {
    | Some(goal) =>
      switch (makeCaseType) {
      | Function => Goal.writeLines(lines, goal)
      | ExtendedLambda => Goal.writeLambda(lines, goal)
      };
      instance |> dispatch(Command.Primitive.Load);
    | None => reject(Command.OutOfGoal)
    };
  | DisplayInfo(info) =>
    instance.view.activatePanel |> Event.emitOk(true);
    Response.Info.handle(info, (x, y, z) =>
      View.Handles.display(x, y, z, instance.view)
    );
  | ClearHighlighting =>
    instance |> Highlightings.destroyAll;
    resolve();
  | _ =>
    Js.log("Unhandled response:");
    Js.log(response);
    resolve();
  };
}
and dispatch = (command, instance): Async.t(unit, Command.error) => {
  instance
  |> handleLocalCommand(command)
  |> thenOk(remote =>
       switch (remote) {
       | None => resolve([||])
       | Some(cmd) =>
         let serialized = Command.Remote.serialize(cmd);
         /* send the serialized command */
         cmd.connection
         |> Connection.send(serialized)
         /* parse the returned response */
         |> mapOk(Emacs.Parser.SExpression.parseFile)
         |> mapOk(Array.map(Result.flatMap(Response.parse)))
         |> mapError(_ => Command.Cancelled);
       }
     )
  |> thenOk((result: array(result(Response.t, string))) => {
       /* array of parsed responses */
       let parseErrors =
         result
         |> Array.filterMap(
              fun
              | Ok(_) => None
              | Error(e) => Some(e),
            );
       if (Array.length(parseErrors) > 0) {
         reject(Command.ParseError(parseErrors));
       } else {
         let responses = result |> Array.filterMap(Option.fromResult);
         /* handle the responses and collect the errors if there's any */
         instance
         |> recoverCursor(() =>
              responses |> Array.map(handleResponse(instance))
            )
         |> all
         |> mapOk(_ => ());
       };
     });
};
