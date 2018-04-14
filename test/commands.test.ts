import * as vscode from 'vscode';
import * as assert from 'assert';
import * as cfg from '../src/configuration';

import * as cmd from '../src/commands';
import { MarkdownStringifier } from '../src/ttMarkdown';
import { OrgStringifier } from '../src/ttOrg';

suite.only('Commands', () => {
    test('Test "Create table" for markdown', (done) => {
        const config = cfg.build({'mode': cfg.Mode.Markdown});

        const expectedResult = `|     |     |
| --- | --- |
|     |     |`;

        vscode.workspace.openTextDocument({language: 'markdown', content: ''}).then((d) => {
            vscode.window.showTextDocument(d).then(() => {
                cmd.createTable(2, 2, vscode.window.activeTextEditor!, config, new MarkdownStringifier()).then(() => {
                    assert.equal(d.getText(), expectedResult);
                    done();
                });
            });
        });
    });

    test('Test "Create table" for org', (done) => {
        const config = cfg.build({'mode': cfg.Mode.Org});

        const expectedResult = `|  |  |
|--+--|
|  |  |`;

        vscode.workspace.openTextDocument({language: 'org', content: ''}).then((d) => {
            vscode.window.showTextDocument(d).then(() => {
                cmd.createTable(2, 2, vscode.window.activeTextEditor!, config, new OrgStringifier()).then(() => {
                    assert.equal(d.getText(), expectedResult);
                    done();
                });
            });
        });
    });
});
