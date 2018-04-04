'use strict';

import * as vscode from 'vscode';
import { OrgLocator, OrgParser, OrgStringifier  } from './ttOrg';
import { Locator, Parser, Stringifier, TableNavigator, Table } from './ttTable';
import { MarkdownLocator, MarkdownParser, MarkdownStringifier } from './ttMarkdown';
import { isUndefined } from 'util';
import { registerContext, ContextType, enterContext, exitContext } from './context';

enum TextTablesMode {
    Org = 'org',
    Markdown = 'markdown'
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
    registerContext(ContextType.TableMode, '$(book) Table Mode', statusItem);

    loadConfiguration();
    vscode.workspace.onDidChangeConfiguration(() => loadConfiguration());

    // Enter table mode context
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.tableModeOn', () => enterContext(ContextType.TableMode)));

    // Exit table mode context
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.tableModeOff', () => exitContext(ContextType.TableMode)));

    // Jump to next cell
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.gotoNextCell', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const table = formatAndGetTableUnderCursor(editor);
            if (table) {
                const nav = new TableNavigator(table);
                const newPos = nav.nextCell(editor.selection.start);
                editor.selection = new vscode.Selection(newPos, newPos);
            }
        }
    }));

    // Jump to previous cell
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.gotoPreviousCell', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const table = formatAndGetTableUnderCursor(editor);
            if (table) {
                const nav = new TableNavigator(table);
                const newPos = nav.previousCell(editor.selection.start);
                editor.selection = new vscode.Selection(newPos, newPos);
            }
        }
    }));

    // Format table under cursor
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.formatUnderCursor', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            formatAndGetTableUnderCursor(editor);
        }
    }));
}

export function deactivate() {
}

/**
 * Try to find table in provided editor in current cursor position.
 * If table was found, formats the table and returns it. Otherwise - returns undefined.
 * @param editor active editor
 * @returns
 */
function formatAndGetTableUnderCursor(editor: vscode.TextEditor): Table | undefined {
    const tableRange = locator.locate(editor.document, editor.selection.start.line);

    if (isUndefined(tableRange)) {
        return undefined;
    }
    const selectedText = editor.document.getText(tableRange);
    const table = parser.parse(selectedText);

    if (isUndefined(table)) {
        return undefined;
    }
    const newText = stringifier.stringify(table);
    editor.edit(b => b.replace(tableRange, newText));
    return table;
}
