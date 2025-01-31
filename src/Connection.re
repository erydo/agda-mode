open Rebase;
open Fn;

module Error = {
  type autoSearch =
    | ProcessHanging
    | NotSupported(string)
    | NotFound(string);

  type validation =
    /* the path is empty */
    | PathMalformed(string)
    /* the process is not responding */
    | ProcessHanging
    /* from the shell */
    | NotFound(Js.Exn.t)
    | ShellError(Js.Exn.t)
    /* from its stderr */
    | ProcessError(string)
    /* the process is not Agda */
    | IsNotAgda(string);

  type connection =
    | ShellError(Js.Exn.t)
    | ClosedByProcess(int, string)
    | DisconnectedByUser;

  type t =
    | AutoSearchError(autoSearch)
    | ValidationError(string, validation)
    | ConnectionError(connection);

  let toString =
    fun
    | AutoSearchError(ProcessHanging) => (
        "Process not responding",
        {j|Please restart the process|j},
      )
    | AutoSearchError(NotSupported(os)) => (
        "Auto search failed",
        {j|currently auto path searching is not supported on $(os)|j},
      )
    | AutoSearchError(NotFound(msg)) => ("Auto search failed", msg)
    | ValidationError(_path, PathMalformed(msg)) => ("Path malformed", msg)
    | ValidationError(_path, ProcessHanging) => (
        "Process hanging",
        "The program has not been responding for more than 1 sec",
      )
    | ValidationError(_path, NotFound(error)) => (
        "Agda not found",
        Util.JsError.toString(error),
      )
    | ValidationError(_path, ShellError(error)) => (
        "Error from the shell",
        Util.JsError.toString(error),
      )
    | ValidationError(_path, ProcessError(msg)) => (
        "Error from the stderr",
        msg,
      )
    | ValidationError(_path, IsNotAgda(msg)) => ("This is not agda", msg)
    | ConnectionError(ShellError(error)) => (
        "Socket error",
        Util.JsError.toString(error),
      )
    | ConnectionError(ClosedByProcess(code, signal)) => (
        "Socket closed by Agda",
        {j|code: $code
signal: $signal
It's probably because Agda's not happy about the arguments you fed her
|j},
      )
    | ConnectionError(DisconnectedByUser) => (
        "Disconnected",
        "Connection disconnected by ourselves",
      );
};

type response = Parser.Incr.Event.t(result(Response.t, Parser.Error.t));

type t = {
  metadata: Metadata.t,
  process: N.ChildProcess.t,
  mutable queue: array(Event.t(response, Error.connection)),
  errorEmitter: Event.t(Response.t, unit),
  mutable connected: bool,
  mutable resetLogOnLoad: bool,
};

let disconnect = (error, self) => {
  self.metadata.entries = [||];
  self.process |> N.ChildProcess.kill("SIGTERM");
  self.queue |> Array.forEach(ev => ev |> Event.emitError(error));
  self.queue = [||];
  self.errorEmitter |> Event.removeAllListeners;
  self.connected = false;
};

/* a more sophiscated "make" */
let autoSearch = (path): Async.t(string, Error.t) =>
  Async.make((resolve, reject) => {
    /* reject if the process hasn't responded for more than 1 second */
    let hangTimeout =
      Js.Global.setTimeout(
        () => reject(ProcessHanging: Error.autoSearch),
        1000,
      );
    let commandName =
      switch (N.OS.type_()) {
      | "Linux"
      | "Darwin" => Ok("which")
      | "Windows_NT" => Ok("where.exe")
      | os => Error(os)
      };

    switch (commandName) {
    | Error(os) => reject(NotSupported(os))
    | Ok(commandName') =>
      N.ChildProcess.exec(
        commandName' ++ " " ++ path,
        (error, stdout, stderr) => {
          /* clear timeout as the process has responded */
          Js.Global.clearTimeout(hangTimeout);

          /* error */
          switch (error |> Js.Nullable.toOption) {
          | None => ()
          | Some(err) =>
            reject(NotFound(err |> Js.Exn.message |> Option.getOr("")))
          };

          /* stderr */
          let stderr' = stderr |> Node.Buffer.toString;
          if (stderr' |> String.isEmpty |> (!)) {
            reject(NotFound(stderr'));
          };

          /* stdout */
          let stdout' = stdout |> Node.Buffer.toString;
          if (stdout' |> String.isEmpty) {
            reject(NotFound(""));
          } else {
            resolve(Parser.filepath(stdout'));
          };
        },
      )
      |> ignore
    };
  })
  |> Async.mapError(e => Error.AutoSearchError(e));

/* a more sophiscated "make" */
let validateAndMake = (pathAndParams): Async.t(Metadata.t, Error.t) =>
  {
    let (path, args) = Parser.commandLine(pathAndParams);
    let parseError =
        (error: Js.Nullable.t(Js.Exn.t)): option(Error.validation) => {
      switch (error |> Js.Nullable.toOption) {
      | None => None
      | Some(err) =>
        let message = err |> Js.Exn.message |> Option.getOr("");
        if (message |> Js.Re.test_([%re "/No such file or directory/"], _)) {
          Some(NotFound(err));
        } else if (message |> Js.Re.test_([%re "/command not found/"], _)) {
          Some(NotFound(err));
        } else {
          Some(ShellError(err));
        };
      };
    };
    let parseVersion =
        (stdout: Node.Buffer.t): result(Metadata.t, Error.validation) => {
      let message = stdout |> Node.Buffer.toString;
      switch (Js.String.match([%re "/Agda version (.*)/"], message)) {
      | None => Error(IsNotAgda(message))
      | Some(match) =>
        switch (match[1]) {
        | None => Error(IsNotAgda(message))
        | Some(version) =>
          Ok({
            path,
            args,
            version,
            protocol:
              Js.Re.test_([%re "/--interaction-json/"], message)
                ? EmacsAndJSON : EmacsOnly,
            entries: [||],
          })
        }
      };
    };

    Async.make((resolve, reject) => {
      if (path |> String.isEmpty) {
        reject(Error.PathMalformed("the path must not be empty"));
      };

      // reject if the process hasn't responded for more than 20 second
      // (it may take longer for dockerized Agda to take off)
      let hangTimeout =
        Js.Global.setTimeout(() => reject(Error.ProcessHanging), 20000);

      N.ChildProcess.exec(
        path,
        (error, stdout, stderr) => {
          /* clear timeout as the process has responded */
          Js.Global.clearTimeout(hangTimeout);
          /* parses `error` and rejects it if there's any  */
          switch (parseError(error)) {
          | None => ()
          | Some(err) => reject(err)
          };

          /* stderr */
          let stderr' = stderr |> Node.Buffer.toString;
          if (stderr' |> String.isEmpty |> (!)) {
            reject(ProcessError(stderr'));
          };
          /* stdout */
          switch (parseVersion(stdout)) {
          | Error(err) => reject(err)
          | Ok(self) => resolve(self)
          };
        },
      )
      |> ignore;
    });
  }
  |> Async.mapError(e => Error.ValidationError(pathAndParams, e));

let connect = (metadata: Metadata.t): Async.t(t, Error.t) =>
  {
    N.(
      Async.make((resolve, reject) => {
        let args = [|"--interaction"|] |> Array.concat(metadata.args);
        let process =
          ChildProcess.spawn(metadata.path, args, {"shell": true});

        let connection = {
          metadata,
          process,
          connected: true,
          queue: [||],
          errorEmitter: Event.make(),
          resetLogOnLoad: true,
        };
        /* Handles errors and anomalies */
        process
        |> ChildProcess.on(
             `error(
               exn => {
                 connection |> disconnect(Error.ShellError(exn));
                 reject(Error.ShellError(exn));
               },
             ),
           )
        |> ChildProcess.on(
             `close(
               (code, signal) => {
                 connection
                 |> disconnect(Error.ClosedByProcess(code, signal));
                 reject(Error.ClosedByProcess(code, signal));
               },
             ),
           )
        |> ignore;
        process
        |> ChildProcess.stdout
        |> Stream.Readable.once(`data(_ => resolve(connection)))
        |> ignore;
      })
    );
  }
  |> Async.mapError(e => Error.ConnectionError(e));

let wire = (self): t => {
  /* resolves the requests in the queue */
  let response = (res: response) => {
    switch (self.queue[0]) {
    | None =>
      switch (res) {
      | OnResult(Ok(data)) => self.errorEmitter |> Event.emitOk(data)
      | _ => ()
      }
    | Some(req) =>
      req |> Event.emitOk(res);
      switch (res) {
      | OnResult(_) => ()
      | OnFinish =>
        self.queue |> Js.Array.pop |> Option.forEach(Event.destroy)
      };
    };
  };
  let logSExpression =
    Parser.Incr.Event.map(
      Result.map(expr => {
        Metadata.logSExpression(expr, self.metadata);
        expr;
      }),
    );

  // let toResponse = Parser.Incr.Event.map(x => x);
  let toResponse =
    Parser.Incr.Event.flatMap(
      fun
      | Error(parseError) => Parser.Incr.Event.OnResult(Error(parseError))
      | Ok(Parser__Type.SExpression.A("Agda2>")) => Parser.Incr.Event.OnFinish
      | Ok(tokens) => Parser.Incr.Event.OnResult(Response.parse(tokens)),
    );

  let logResponse =
    Parser.Incr.Event.map(
      Result.map(expr => {
        Metadata.logResponse(expr, self.metadata);
        expr;
      }),
    );

  let callback =
    Parser.SExpression.makeIncr(
      logSExpression >> toResponse >> logResponse >> response,
    );

  /* listens to the "data" event on the stdout */
  /* The chunk may contain various fractions of the Agda output */
  let onData: Node.buffer => unit =
    chunk => {
      /* serialize the binary chunk into string */
      let rawText = chunk |> Node.Buffer.toString;
      /* store the raw text in the log */
      Metadata.logRawText(rawText, self.metadata);
      // run the parser
      rawText |> Parser.split |> Array.forEach(Parser.Incr.feed(callback));
    };
  self.process
  |> N.ChildProcess.stdout
  |> N.Stream.Readable.on(`data(onData))
  |> ignore;

  self;
};

let send = (request, self): Event.t(response, Error.connection) => {
  let reqEvent = Event.make();
  self.queue |> Js.Array.push(reqEvent) |> ignore;

  /* write */
  self.process
  |> N.ChildProcess.stdin
  |> N.Stream.Writable.write(request ++ "\n" |> Node.Buffer.fromString)
  |> ignore;

  reqEvent;
};

let resetLog = self => {
  self.metadata.entries = [||];
};
