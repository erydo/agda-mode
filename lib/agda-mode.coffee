Agda = require './agda'

module.exports =

  configDefaults:
    agdaExecutablePath: ''
    agdaLibraryPath: ''

  activate: (state) ->

    # editor active/inactive event register, fuck Atom's event clusterfuck
    currentEditor = atom.workspaceView.getActivePaneItem()
    atom.workspaceView.on 'pane-container:active-pane-item-changed', (event, nextEditor) =>
      if nextEditor.getPath() isnt currentEditor.getPath()
        currentEditor.emit 'became-inactive'
        nextEditor.emit 'became-active'
        currentEditor = nextEditor


    atom.workspace.eachEditor (editor) =>
      if @isAgdaFile(editor)
        editor.agda = new Agda editor

        # deactivated on default
        editor.agda.syntax.deactivate()

        # make sure that the highlighting is consistent with Agda' state,
        # highlighting on only when loaded and passed.
        #
        # We need to do this because Atom is so fucking slow, it may
        # apply highlighting after we deactivated it.
        editor.on 'grammar-changed', =>
          grammarIsAgda = editor.getGrammar().name is 'Agda'
          shouldHighlight = editor.agda.passed and editor.agda.passed
          if grammarIsAgda and not shouldHighlight
            # fuck you atom
            editor.agda.syntax.deactivate()

        editor.on 'became-active', =>
          editor.agda.emit 'activate'
        editor.on 'became-inactive', =>
          editor.agda.emit 'deactivate'


    # load
    atom.workspaceView.command 'agda-mode:load', =>
      if @isAgdaFile()
        editor = @getTheFuckingEditor()
        editor.agda.load()


    # quit
    atom.workspaceView.command 'agda-mode:quit', =>
      if @isAgdaFile()
        editor = @getTheFuckingEditor()
        editor.agda.quit()


    # restart
    atom.workspaceView.command 'agda-mode:restart', =>
      if @isAgdaFile()
        editor = @getTheFuckingEditor()
        editor.agda.restart()


  getTheFuckingEditor: ->
    atom.workspace.getActivePaneItem()


  # if end with ".agda"
  isAgdaFile: (editor) ->
    if editor
      filePath = editor.getPath()
    else
      filePath = @getTheFuckingEditor().getPath()
    /\.agda$/.test filePath


  deactivate: ->
    # @agdaExecutableView.destroy()


  serialize: ->
    # agdaModeViewState: @agdaModeView.serialize()
