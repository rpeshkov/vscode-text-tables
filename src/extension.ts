'use strict';

import * as vscode from 'vscode';
import { OrgLocator, OrgParser, OrgStringifier } from './ttOrg';
import { Locator, Parser, Stringifier } from './ttTable';
import { MarkdownLocator, MarkdownParser, MarkdownStringifier } from './ttMarkdown';

export function activate(ctx: vscode.ExtensionContext) {
    ctx.subscriptions.push(vscode.commands.registerCommand('text-tables.formatUnderCursor', () => {
        const config = vscode.workspace.getConfiguration('text-tables');
        const mode = config.get<string>('mode', '');

        let locator: Locator;
        let parser: Parser;
        let stringifier: Stringifier;

        if (mode === 'org') {
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
