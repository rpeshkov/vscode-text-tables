import * as vscode from 'vscode';

export const section = 'text-tables';

export const modeKey = 'mode';
export const showStatusKey = 'showStatus';

export enum Mode {
    Org = 'org',
    Markdown = 'markdown'
}

export function get<T>(key: string, defaultValue: T): T {
    return vscode.workspace.getConfiguration(section).get<T>(key, defaultValue);
}
