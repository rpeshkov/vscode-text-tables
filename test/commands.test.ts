import * as vscode from 'vscode';
import * as assert from 'assert';
import * as cfg from '../src/configuration';

import * as cmd from '../src/commands';
import { MarkdownStringifier } from '../src/ttMarkdown';
import { OrgStringifier } from '../src/ttOrg';

function inTextEditor(options: { language?: string; content?: string; },
    cb: (editor: vscode.TextEditor, document: vscode.TextDocument) => void) {
    vscode.workspace.openTextDocument(options).then((d) => {
        vscode.window.showTextDocument(d).then(() => {
            cb(vscode.window.activeTextEditor!, d);
        });
    });
}

suite.only('Commands', () => {
    test('Test "Create table" for markdown', (done) => {
        const config = cfg.build({'mode': cfg.Mode.Markdown});

        const expectedResult = `|     |     |
| --- | --- |
|     |     |`;

        inTextEditor({language: 'markdown'}, (editor, document) => {
            cmd.createTable(2, 2, editor, config, new MarkdownStringifier()).then(() => {
                assert.equal(document.getText(), expectedResult);
                done();
            });
        });
    });

    test('Test "Create table" for org', (done) => {
        const config = cfg.build({'mode': cfg.Mode.Org});

        const expectedResult = `|  |  |
|--+--|
|  |  |`;

        inTextEditor({language: 'org'}, (editor, document) => {
            cmd.createTable(2, 2, editor, config, new OrgStringifier()).then(() => {
                assert.equal(document.getText(), expectedResult);
                done();
            });
        });
    });
});
