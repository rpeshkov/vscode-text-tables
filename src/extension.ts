'use strict';

import * as vscode from 'vscode';
import { OrgLocator, OrgParser, OrgStringifier  } from './ttOrg';
import { Locator, Parser, Stringifier, TableNavigator } from './ttTable';
import { MarkdownLocator, MarkdownParser, MarkdownStringifier } from './ttMarkdown';
import { isUndefined } from 'util';

enum TextTablesMode {
    Org = "org",
    Markdown = "markdown"
}

/**
 * Set editor context
 * @param context Context to set
 * @param state State of context
 */
function setContext(context: string, state: boolean) {
    vscode.commands.executeCommand('setContext', context, state);
}

let locator: Locator;
let parser: Parser;
let stringifier: Stringifier;

function loadConfiguration() {
    const config = vscode.workspace.getConfiguration('text-tables');
    const mode = config.get<string>('mode', TextTablesMode.Markdown);

    if (mode === TextTablesMode.Org) {
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
    const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

    statusItem.text = '$(book) Table Mode: Off';
    statusItem.show();

    loadConfiguration();
    vscode.workspace.onDidChangeConfiguration(() => loadConfiguration());

    // Enter table mode context
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.tableModeOn',
        () => {
            setContext('tableMode', true);
            statusItem.text = '$(book) Table Mode: On';
        }));


    // Exit table mode context
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.tableModeOff',
        () => {
            setContext('tableMode', false);
            statusItem.text = '$(book) Table Mode: Off';
        }));

    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.gotoNextCell', () => {
        if (!isUndefined(vscode.window.activeTextEditor)) {
            const editor = vscode.window.activeTextEditor;
            const tableRange = locator.locate(editor.document, editor.selection.start.line);

            if (tableRange !== undefined) {
                const tableText = editor.document.getText(tableRange);
                const table = parser.parse(tableText);

                if (table !== undefined) {
                    const newText = stringifier.stringify(table);
                    editor.edit(b => b.replace(tableRange, newText));
                    const nav = new TableNavigator(table);
                    const newPos = nav.nextCell(editor.selection.start);
                    editor.selection = new vscode.Selection(newPos, newPos);
                }
            }
        }
    }));

    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.gotoPreviousCell', () => {
        if (!isUndefined(vscode.window.activeTextEditor)) {
            const editor = vscode.window.activeTextEditor;
            const tableRange = locator.locate(editor.document, editor.selection.start.line);

            if (tableRange !== undefined) {
                const tableText = editor.document.getText(tableRange);
                const table = parser.parse(tableText);

                if (table !== undefined) {
                    const newText = stringifier.stringify(table);
                    editor.edit(b => b.replace(tableRange, newText));
                    const nav = new TableNavigator(table);
                    const newPos = nav.previousCell(editor.selection.start);
                    editor.selection = new vscode.Selection(newPos, newPos);
                }
            }
        }
    }));

    // Format table under cursor
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.formatUnderCursor', () => {
        if (vscode.window.activeTextEditor !== undefined) {
            const editor = vscode.window.activeTextEditor;
            const selectedRange = locator.locate(editor.document, editor.selection.start.line);

            if (selectedRange !== undefined) {
                const selectedText = editor.document.getText(selectedRange);
                const table = parser.parse(selectedText);

                if (table !== undefined) {
                    const newText = stringifier.stringify(table);
                    editor.edit(b => b.replace(selectedRange, newText));
                }
            }
        }
    }));
}

export function deactivate() {
}
