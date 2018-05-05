'use strict';

import * as vscode from 'vscode';
import * as utils from './utils';
import * as cmd from './commands';
import { OrgLocator, OrgParser, OrgStringifier } from './ttOrg';
import { Locator, Parser, Stringifier, Table } from './ttTable';
import { MarkdownLocator, MarkdownParser, MarkdownStringifier } from './ttMarkdown';
import { isUndefined } from 'util';
import { registerContext, ContextType, enterContext, exitContext, restoreContext } from './context';
import * as cfg from './configuration';

let locator: Locator;
let parser: Parser;
let stringifier: Stringifier;
let configuration: cfg.Configuration;

function loadConfiguration() {
    configuration = cfg.build();

    if (configuration.mode === cfg.Mode.Org) {
        locator = new OrgLocator();
        parser = new OrgParser();
        stringifier = new OrgStringifier();
    } else {
        locator = new MarkdownLocator();
        parser = new MarkdownParser();
        stringifier = new MarkdownStringifier();
    }
}

export function activate(ctx: vscode.ExtensionContext) {
    loadConfiguration();

    const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    registerContext(ContextType.TableMode, '$(book) Table Mode', statusItem);

    if (configuration.showStatus) {
        statusItem.show();
    }

    vscode.workspace.onDidChangeConfiguration(() => {
        loadConfiguration();

        if (configuration.showStatus) {
            statusItem.show();
        } else {
            statusItem.hide();
        }
    });

    vscode.window.onDidChangeActiveTextEditor(e => {
        if (e) {
            restoreContext(e);
        }
    });

    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.enable', () => {
        vscode.window.showInformationMessage('Text tables enabled!');
    }));

    ctx.subscriptions.push(vscode.commands.registerTextEditorCommand('text-tables.tableModeOn',
        (e) => enterContext(e, ContextType.TableMode)));
    ctx.subscriptions.push(vscode.commands.registerTextEditorCommand('text-tables.tableModeOff',
        (e) => exitContext(e, ContextType.TableMode)));

    ctx.subscriptions.push(registerTableCommand('text-tables.moveRowDown', cmd.moveRowDown, {format: true}));
    ctx.subscriptions.push(registerTableCommand('text-tables.moveRowUp', cmd.moveRowUp, {format: true}));
    ctx.subscriptions.push(registerTableCommand('text-tables.moveColRight', (editor, e, range, table) => {
        cmd.moveColRight(editor, e, range, table, stringifier);
    }));
    ctx.subscriptions.push(registerTableCommand('text-tables.moveColLeft', (editor, e, range, table) => {
        cmd.moveColLeft(editor, e, range, table, stringifier);
    }));

    ctx.subscriptions.push(vscode.commands.registerTextEditorCommand('text-tables.clearCell',
        (e, ed) => cmd.clearCell(e, ed, parser)));

    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.gotoNextCell', async () => {
        // TODO: Refactor this by reimplementing registerTableCommand function
        // Internally registerTableCommand uses registerTextEditorCommand which doesn't allow to apply multiple edits
        // from different places.
        const editor = vscode.window.activeTextEditor;
        if (isUndefined(editor)) {
            return;
        }

        const tableRange = locator.locate(editor.document, editor.selection.start.line);
        if (isUndefined(tableRange)) {
            return;
        }
        const selectedText = editor.document.getText(tableRange);
        const table = parser.parse(selectedText);

        if (isUndefined(table)) {
            return;
        }

        table.startLine = tableRange.start.line;

        await cmd.gotoNextCell(editor, tableRange, table, stringifier);
    }));

    ctx.subscriptions.push(registerTableCommand('text-tables.gotoPreviousCell', cmd.gotoPreviousCell, {format: true}));
    ctx.subscriptions.push(registerTableCommand('text-tables.nextRow', (editor, e, range, table) => {
        cmd.nextRow(editor, e, range, table, stringifier);
    }));

    // Format table under cursor
    ctx.subscriptions.push(registerTableCommand('text-tables.formatUnderCursor',
        (editor, e, range, table) => cmd.formatUnderCursor(editor, e, range, table, stringifier)));

    ctx.subscriptions.push(vscode.commands.registerTextEditorCommand('text-tables.createTable', editor => {
        const opts: vscode.InputBoxOptions = {
            value: '5x2',
            prompt: 'Table size Columns x Rows (e.g. 5x2)',
            validateInput: (value: string) => {
                if (!utils.tableSizeRe.test(value)) {
                    return 'Provided value is invalid. Please provide the value in format Columns x Rows (e.g. 5x2)';
                }
                return;
            }
        };

        vscode.window.showInputBox(opts).then(x => {
            if (!x) {
                return;
            }

            const match = x.match(utils.tableSizeRe);
            if (match) {
                const cols = +match[1] || 1;
                const rows = +match[2] || 2;
                cmd.createTable(rows, cols, editor, configuration, stringifier);
            }
        });
    }));
}

export function deactivate() {
}

type TableCommandCallback = (editor: vscode.TextEditor, e: vscode.TextEditorEdit, tableLocation: vscode.Range, table: Table) => void;

function registerTableCommand(command: string, callback: TableCommandCallback, options?: {format: boolean}) {
    return vscode.commands.registerTextEditorCommand(command, async (editor, e) => {
        const tableRange = locator.locate(editor.document, editor.selection.start.line);
        if (isUndefined(tableRange)) {
            return;
        }
        const selectedText = editor.document.getText(tableRange);
        const table = parser.parse(selectedText);

        if (isUndefined(table)) {
            return;
        }

        table.startLine = tableRange.start.line;

        if (options && options.format) {
            cmd.formatUnderCursor(editor, e, tableRange, table, stringifier).then(() => callback(editor, e, tableRange, table));
        } else {
            callback(editor, e, tableRange, table);
        }
    });
}
