open Rebase;

type t('a, 'e) = {
  acquire: unit => Async.t('a, 'e),
  supply: 'a => unit,
};
let make = (): t('a, 'e) => {
  // resource that is temporarily unavailable
  let resource = ref(None: option('a));
  // queue of callbacks waiting to be resolved
  let queue = ref([]);
  // return the resource if it's immediately available, else waits in the queue
  let acquire = () =>
    switch (resource^) {
    | None => Async.make((resolve, _) => queue := [resolve, ...queue^])
    | Some(x) => Async.resolve(x)
    };
  // iterate through the list of waiting callbacks and resolve them
  let supply = x => {
    resource := Some(x);
    queue^ |> List.forEach(resolve => resolve(x));
  };
  {acquire, supply};
};
