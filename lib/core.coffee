{EventEmitter} = require 'events'
Q = require 'Q'

# Components
Commander = require './commander'
Executable = require './executable'
Panel = require './panel'

class Core extends EventEmitter
    constructor: (@editor) ->
        # initialize all components
        @commander  = new Commander     @
        @executable = new Executable    @
        @panel      = new Panel         @

        console.log "[Core] initialized"

        @commander.on 'load', =>
            console.log "[Commander] load"
            @executable.load()

module.exports = Core
