import * as vscode from 'vscode';

export const tableSizeRe = /^(\d+)x(\d+)$/u;

export function convertEOL(eol: vscode.EndOfLine): string {
    if (eol === vscode.EndOfLine.CRLF) {
        return '\r\n';
    }
    else {
        return '\n';
    }
}
