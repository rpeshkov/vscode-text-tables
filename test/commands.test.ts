import * as vscode from 'vscode';
import * as assert from 'assert';
import * as cfg from '../src/configuration';

import * as cmd from '../src/commands';
import { MarkdownStringifier } from '../src/ttMarkdown';
import { OrgStringifier } from '../src/ttOrg';

async function inTextEditor(options: { language?: string; content?: string; },
    cb: (editor: vscode.TextEditor, document: vscode.TextDocument) => void) {
    const d = await vscode.workspace.openTextDocument(options);
    await vscode.window.showTextDocument(d);
    await cb(vscode.window.activeTextEditor!, d);
}

function move(editor: vscode.TextEditor, line: number, col: number) {
    const pos = new vscode.Position(line, col);
    editor.selection = new vscode.Selection(pos, pos);
}

suite('Commands', () => {
    setup(async () => {
        await vscode.workspace.updateWorkspaceFolders(0, null, {uri: vscode.Uri.parse('.')});
    });

    test('Test "Create table" for markdown', async () => {
        const expectedResult = `|     |     |
| --- | --- |
|     |     |`;

        await inTextEditor({language: 'markdown'}, async (editor, document) => {
            await cfg.override({'mode': cfg.Mode.Markdown});
            const config = cfg.build();
            await cmd.createTable(2, 2, editor, config, new MarkdownStringifier());
            assert.equal(document.getText(), expectedResult);
        });
    });

    test('Test "Create table" for org', async () => {
        const expectedResult = `|  |  |
|--+--|
|  |  |`;

        await inTextEditor({language: 'org'}, async (editor, document) => {
            await cfg.override({'mode': cfg.Mode.Org});
            const config = cfg.build();
            await cmd.createTable(2, 2, editor, config, new OrgStringifier());
            assert.equal(document.getText(), expectedResult);
        });
    });

    test('Test "Clear cell"', async () => {
        const testCase =
`| Hello | World | Some other text
| ----- | ----- |`;
        const expectedResult =
`|       | World |                \n` +
`| ----- | ----- |`;

        await inTextEditor({language: 'markdown', content: testCase}, async (editor, document) => {
            await cfg.override({mode: 'markdown'});
            await vscode.commands.executeCommand('text-tables.clearCell');
            move(editor, 0, 2);
            await vscode.commands.executeCommand('text-tables.clearCell');
            move(editor, 0, 17);
            await vscode.commands.executeCommand('text-tables.clearCell');
            move(editor, 1, 2);
            await vscode.commands.executeCommand('text-tables.clearCell');
            assert.equal(document.getText(), expectedResult);
        });
    });

    test('Test "Go to next cell"', async () => {
        const input = `|        |            |
|--+--|
|  |  |`;
        const expected = `|  |  |
|--+--|
|  |  |
|  |  |`;

        const testCases = [
            new vscode.Position(0, 2),
            new vscode.Position(0, 5),
            new vscode.Position(2, 2),
            new vscode.Position(2, 5),
            new vscode.Position(3, 2),
            new vscode.Position(3, 5),
        ];

        await inTextEditor({language: 'markdown', content: input}, async (editor, document) => {
            await cfg.override({mode: 'org'});
            for (const t of testCases) {
                await vscode.commands.executeCommand('text-tables.gotoNextCell');
                assert.deepEqual(editor.selection.start, t);
            }

            assert.equal(document.getText(), expected);
        });
    });

    test('Test "Go to previous cell"', async () => {
        const input = `|        |            |
|--+--|
|  |  |`;

        const testCases = [
            new vscode.Position(2, 2),
            new vscode.Position(0, 5),
            new vscode.Position(0, 2),
            // Repeated intentionally to check that it won't jump outside
            new vscode.Position(0, 2),
        ];

        await inTextEditor({language: 'markdown', content: input}, async (editor, _) => {
            await cfg.override({mode: 'org'});
            move(editor, 2, 5);
            for (const t of testCases) {
                await vscode.commands.executeCommand('text-tables.gotoPreviousCell');
                assert.deepEqual(editor.selection.start, t);
            }
        });
    });

    test('Test "Move row down"', async () => {
        const input = `| 1 | 2 |
|---+---|
| 3 | 4 |`;

        const steps = [
`|---+---|
| 1 | 2 |
| 3 | 4 |`
,
`|---+---|
| 3 | 4 |
| 1 | 2 |`,
`|---+---|
| 3 | 4 |
| 1 | 2 |`
        ];

        await inTextEditor({language: 'org', content: input}, async (_, document) => {
            await cfg.override({mode: 'org'});

            for (const expected of steps) {
                await vscode.commands.executeCommand('text-tables.moveRowDown');
                assert.equal(document.getText(), expected);
            }
        });
    });

    test('Test "Move row up"', async () => {
        const input =
`|---+---|
| 3 | 4 |
| 1 | 2 |`;

        const steps = [
`|---+---|
| 1 | 2 |
| 3 | 4 |`
,
`| 1 | 2 |
|---+---|
| 3 | 4 |`
,
`| 1 | 2 |
|---+---|
| 3 | 4 |`

        ];

        await inTextEditor({language: 'org', content: input}, async (editor, document) => {
            await cfg.override({mode: 'org'});
            move(editor, 2, 0);
            for (const expected of steps) {
                await vscode.commands.executeCommand('text-tables.moveRowUp');
                assert.equal(document.getText(), expected);
            }
        });
    });

    test('Test "Move col right"', async () => {
        const input =
`| 1 | 2 | 3 |
| 4 | 5 | 6 |`;

        const steps = [
`| 2 | 1 | 3 |
| 5 | 4 | 6 |`
,
`| 2 | 3 | 1 |
| 5 | 6 | 4 |`
,
`| 2 | 3 | 1 |
| 5 | 6 | 4 |`

        ];

        await inTextEditor({language: 'org', content: input}, async (editor, document) => {
            await cfg.override({mode: 'org'});
            move(editor, 0, 2);
            for (const expected of steps) {
                await vscode.commands.executeCommand('text-tables.moveColRight');
                assert.equal(document.getText(), expected);
            }
        });
    });

    test('Test "Move col left"', async () => {
        const input =
`| 1 | 2 | 3 |
| 4 | 5 | 6 |`;

        const steps = [
`| 1 | 3 | 2 |
| 4 | 6 | 5 |`
,
`| 3 | 1 | 2 |
| 6 | 4 | 5 |`
,
`| 3 | 1 | 2 |
| 6 | 4 | 5 |`
        ];

        await inTextEditor({language: 'org', content: input}, async (editor, document) => {
            await cfg.override({mode: 'org'});
            move(editor, 0, 10);
            for (const expected of steps) {
                await vscode.commands.executeCommand('text-tables.moveColLeft');
                assert.equal(document.getText(), expected);
            }
        });
    });

    test('Test "Format under cursor"', async () => {
        const input =
`| 1   |   2     |        3     |
| 4    | 5       |        6 |`;

        const expected =
`| 1 | 2 | 3 |
| 4 | 5 | 6 |`;

        await inTextEditor({language: 'org', content: input}, async (_, document) => {
            await cfg.override({mode: 'org'});

            await vscode.commands.executeCommand('text-tables.formatUnderCursor');
            assert.equal(document.getText(), expected);
        });
    });

    test('Test "Format under cursor" for markdown', async () => {
        const input =
`| 1   |   2     |
| --- |
| 4    | 5       |        6 |`;

        const expected =
`| 1   | 2   |     |
| --- | --- | --- |
| 4   | 5   | 6   |`;

        await inTextEditor({language: 'markdown', content: input}, async (_, document) => {
            await cfg.override({mode: 'markdown'});

            await vscode.commands.executeCommand('text-tables.formatUnderCursor');
            assert.equal(document.getText(), expected);
        });
    });

    test('Test "Next Row"', async () => {
        const input =
`| Row  |
| Row2 |`;

        const steps = [
`| Row  |
| Row2 |`
,
`| Row  |
| Row2 |
|      |`
,
`| Row  |
| Row2 |
|      |
|      |`
        ]

        await inTextEditor({language: 'org', content: input}, async (editor, document) => {
            await cfg.override({mode: 'org'});
            move(editor, 0, 2);
            for (const expected of steps) {
                await vscode.commands.executeCommand('text-tables.nextRow');
                assert.equal(document.getText(), expected);
            }
        });
    });
});
