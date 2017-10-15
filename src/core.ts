import * as _ from 'lodash';
type CompositeDisposable = any;
type Range = any;
type Editor = any;
declare var atom: any;
var { Range, CompositeDisposable } = require('atom');
import * as Redux from 'redux';
import * as Promise from 'bluebird';

import { parseFilepath } from './parser';
import { View as ViewType } from './type';

// # Components
import Commander from './commander';
import ConnectionManager from './connection';
import TextBuffer from './text-buffer';
import InputMethod from './input-method';
import HighlightManager from './highlight-manager';
import View from './view';
import * as Action from './view/actions';

export default class Core {
    private disposables: CompositeDisposable;
    public textBuffer: TextBuffer;
    public inputMethod: InputMethod;
    public highlightManager: HighlightManager;
    public commander: Commander;
    public view: View;
    public connection: ConnectionManager;

    constructor(public editor: Editor) {


        // helper methods on this.editor
        this.editor.fromIndex = (ind: number): number => {
            return this.editor.getBuffer().positionForCharacterIndex(ind);
        }
        this.editor.toIndex = (pos: number): number => {
            return this.editor.getBuffer().characterIndexForPosition(pos);
        }
        this.editor.translate = (pos: number, n: number): number => {
            return this.editor.fromIndex((this.editor.toIndex(pos)) + n)
        }

        this.editor.fromCIRange = (range: { start: number, end: number }): Range => {
            const start = this.editor.fromIndex(range.start);
            const end   = this.editor.fromIndex(range.end);
            return new Range(start, end);
        }

        // initialize all components
        this.disposables        = new CompositeDisposable();
        // view
        this.view               = new View(this);
        this.textBuffer         = new TextBuffer(this);
        if (atom.config.get('agda-mode.inputMethod'))
            this.inputMethod    = new InputMethod(this);
        this.highlightManager   = new HighlightManager(this);
        this.commander          = new Commander(this);
        this.connection         = new ConnectionManager(this);

        // dispatch config related data to the store on initialization
        this.view.store.dispatch(Action.updateMaxBodyHeight(atom.config.get('agda-mode.maxBodyHeight')));
    }

    // issue #48, TextBuffer::save will be async in Atom 1.19
    saveEditor(): Promise<void> {
        let promise = this.editor.save();
        if (promise && promise.then) {
            return promise.then((e) => {
                return Promise.resolve();
            })
        } else {
            return Promise.resolve();
        }
    }

    // shorthand for getting the path of the binded file
    getPath(): string {
        return parseFilepath(this.editor.getPath());
    }

    // Editor Events

    activate() {
        this.view.activatePanel();
    }

    deactivate() {
        this.view.deactivatePanel();
    }

    destroy() {
        this.commander.dispatch({ kind: "Quit" }).then(() => {
            this.view.destroy();
            this.disposables.dispose();
        });
    }
}
