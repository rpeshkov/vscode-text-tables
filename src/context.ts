import * as vscode from 'vscode';

export enum ContextType {
    TableMode = 'tableMode'
}

const contexts: Map<ContextType, Context> = new Map();

export function registerContext(type: ContextType, title: string, statusItem?: vscode.StatusBarItem) {
    const ctx = new Context(type, title, statusItem);
    contexts.set(type, ctx);
    ctx.setState(false);
}

export function enterContext(type: ContextType) {
    const ctx = contexts.get(type);
    if (ctx) {
        ctx.setState(true);
    }
}

export function exitContext(type: ContextType) {
    const ctx = contexts.get(type);
    if (ctx) {
        ctx.setState(false);
    }
}

class Context {

    constructor(private type: ContextType, private title: string, private statusItem?: vscode.StatusBarItem) {

    }

    setState(isEnabled: boolean) {
        vscode.commands.executeCommand('setContext', this.type, isEnabled);
        if (this.statusItem) {
            const stateText = isEnabled ? 'On' : 'Off';
            this.statusItem.text = `${this.title}: ${stateText}`;

        }
    }
}
