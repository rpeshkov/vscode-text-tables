'use strict';

import * as vscode from 'vscode';
import { OrgLocator, OrgParser, OrgStringifier } from './ttOrg';
import { Locator, Parser, Stringifier } from './ttTable';
import { MarkdownLocator, MarkdownParser, MarkdownStringifier } from './ttMarkdown';

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

export function activate(ctx: vscode.ExtensionContext) {
    const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusItem.text = 'Table Mode: Off';
    statusItem.show();

    // Enter table mode context
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.tableModeOn',
        () => {
            setContext('tableMode', true);
            statusItem.text = 'Table Mode: On';
        }));


    // Exit table mode context
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.tableModeOff',
        () => {
            setContext('tableMode', false);
            statusItem.text = 'Table Mode: Off';
        }));

    // Format table under cursor
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.formatUnderCursor', () => {
        const config = vscode.workspace.getConfiguration('text-tables');
        const mode = config.get<string>('mode', TextTablesMode.Markdown);

        let locator: Locator;
        let parser: Parser;
        let stringifier: Stringifier;

        if (mode === TextTablesMode.Org) {
            locator = new OrgLocator();
            parser = new OrgParser();
            stringifier = new OrgStringifier();
        } else {
            locator = new MarkdownLocator();
            parser = new MarkdownParser();
            stringifier = new MarkdownStringifier();
        }

        if (vscode.window.activeTextEditor !== undefined) {
            const editor = vscode.window.activeTextEditor;

            const selectedRange = locator.locate(editor.document, editor.selection.start.line);
            if (selectedRange !== undefined) {
                const selectedText = editor.document.getText(selectedRange);

                const table = parser.parse(selectedText);
                if (table !== undefined) {
                    const newText = stringifier.stringify(table);

                    editor.edit(b => {
                        b.replace(selectedRange, newText);
                    });
                }
            }
        }
    }));
}

export function deactivate() {
}
