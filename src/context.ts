import * as vscode from 'vscode';

export enum ContextType {
    TableMode = 'tableMode',
    PotentiallyInTable = 'potentiallyInTable',
    InTable = 'inTable'
}

const contexts: Map<ContextType, Context> = new Map();
const state: Map<string, ContextType[]> = new Map();

const tableSeparatorStart = /[|] ?[\-]*/;

export function registerContext(type: ContextType, title: string, statusItem?: vscode.StatusBarItem) {
    const ctx = new Context(type, title, statusItem);
    contexts.set(type, ctx);
    ctx.setState(false);
}

export function enterContext(editor: vscode.TextEditor, type: ContextType) {
    console.log(`enterContext: ${type}`);

    const ctx = contexts.get(type);
    if (ctx) {
        ctx.setState(true);

        const editorState = state.get(editor.document.fileName) || [];
        state.set(editor.document.fileName, editorState.concat(type));
    }
}

export function exitContext(editor: vscode.TextEditor, type: ContextType) {
    console.log(`exitContext: ${type}`);

    const ctx = contexts.get(type);
    if (ctx) {
        ctx.setState(false);

        const editorState = state.get(editor.document.fileName) || [];
        state.set(editor.document.fileName, editorState.filter(x => x !== type));
    }
}

export function toggleContext(editor: vscode.TextEditor, type: ContextType) {
    const editorState = state.get(editor.document.fileName) || [];
    if (editorState.indexOf(ContextType.TableMode) >= 0) {
        exitContext(editor, type);
    } else {
        enterContext(editor, type);
    }
}

export function restoreContext(editor: vscode.TextEditor) {
    let toEnter: ContextType[] = [];
    // @ts-ignore
    let toExit: ContextType[] = Object.keys(ContextType).map((x: any) => ContextType[x] as ContextType);

    if (state.has(editor.document.fileName)) {
        toEnter = state.get(editor.document.fileName)!;
        toExit = toExit.filter(x => toEnter.indexOf(x) < 0);
    }

    toEnter.forEach(x => enterContext(editor, x));
    toExit.forEach(x => exitContext(editor, x));
}

export function updateSelectionContext(): void {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const inTable = selectionInTable(editor);

        if (selectionInTable(editor)) {
            enterContext(editor, ContextType.InTable);
        }
        else {
            exitContext(editor, ContextType.InTable);
        }

        if (inTable || selectionPotentiallyInTable(editor)) {
            enterContext(editor, ContextType.PotentiallyInTable);
        }
        else {
            exitContext(editor, ContextType.PotentiallyInTable);
        }
    }
}

function selectionInTable(editor: vscode.TextEditor): boolean {
    if (editor.selections.length === 1) {
        const selection = editor.selections[0];
        if (selection.start.isEqual(selection.end)) {
            const line = editor.document.lineAt(selection.start.line).text;
            const left = line.substr(0, selection.start.character);
            const right = line.substr(selection.start.character);

            return ((left.indexOf('|') >= 0) && (right.indexOf('|') >= 0));
        }
    }
    return false;
}

function selectionPotentiallyInTable(editor: vscode.TextEditor): boolean {
    if (editor.selections.length === 1) {
        const selection = editor.selections[0];
        if (selection.start.isEqual(selection.end)) {
            const line = editor.document.lineAt(selection.start.line).text;
            const left = line.substr(0, selection.start.character);

            return (tableSeparatorStart.test(left));
        }
    }
    return false;
}

class Context {
    constructor(private type: ContextType, private title: string, private statusItem?: vscode.StatusBarItem) {

    }

    setState(isEnabled: boolean) {
        vscode.commands.executeCommand('setContext', this.type, isEnabled);
        if (this.statusItem) {
            const stateText = isEnabled ? '$(check)' : '$(x)';
            this.statusItem.text = `${this.title} ${stateText}`;
        }
    }
}
