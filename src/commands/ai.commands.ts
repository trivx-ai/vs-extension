import * as vscode from 'vscode';
import { AIService, StreamCallbacks } from '../services/ai.service';
import { COMMANDS } from '../constants';

export function registerAICommands(
  context: vscode.ExtensionContext,
  openChatPanel: () => void
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.OPEN_AI_CHAT, () => {
      openChatPanel();
    }),

    vscode.commands.registerCommand(COMMANDS.AI_SUGGEST, async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor. Open a file first.');
        return;
      }

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);

      if (!selectedText) {
        vscode.window.showWarningMessage('Please select some code first.');
        return;
      }

      const action = await vscode.window.showQuickPick(
        [
          { label: '$(lightbulb) Explain Code', value: 'explain', prompt: 'Explain this code:\n\n' },
          { label: '$(pencil) Refactor', value: 'refactor', prompt: 'Suggest refactoring for this code:\n\n' },
          { label: '$(bug) Find Bugs', value: 'bugs', prompt: 'Find potential bugs in this code:\n\n' },
          { label: '$(shield) Security Review', value: 'security', prompt: 'Review this code for security issues:\n\n' },
          { label: '$(file-add) Generate Tests', value: 'tests', prompt: 'Generate unit tests for this code:\n\n' },
          { label: '$(book) Add Documentation', value: 'docs', prompt: 'Add documentation comments to this code:\n\n' },
        ],
        { placeHolder: 'What would you like AI to do with this code?' }
      );

      if (!action) { return; }

      const aiService = AIService.getInstance();
      const fileName = editor.document.fileName.split(/[/\\]/).pop() || 'unknown';
      const language = editor.document.languageId;
      const message = `${action.prompt}\`\`\`${language}\n// File: ${fileName}\n${selectedText}\n\`\`\``;

      const responseChunks: string[] = [];
      const outputChannel = vscode.window.createOutputChannel('Trivx AI');
      outputChannel.show(true);
      outputChannel.appendLine(`=== Trivx AI: ${action.label.replace(/\$\([^)]+\)\s*/, '')} ===\n`);

      try {
        await aiService.streamMessage(message, undefined, {
          onToken: (token: string) => {
            responseChunks.push(token);
            outputChannel.append(token);
          },
          onComplete: (fullResponse: string) => {
            outputChannel.appendLine('\n\n=== End ===');
          },
          onError: (error: Error) => {
            outputChannel.appendLine(`\n\nError: ${error.message}`);
          },
        });
      } catch (error: any) {
        vscode.window.showErrorMessage(`AI request failed: ${error.message}`);
      }
    }),

    vscode.commands.registerCommand('trivx.aiQuickQuestion', async () => {
      const question = await vscode.window.showInputBox({
        prompt: 'Ask Trivx AI anything about your project or DevOps',
        placeHolder: 'How do I optimize my deployment pipeline?',
        ignoreFocusOut: true,
      });

      if (!question) { return; }

      const aiService = AIService.getInstance();
      const outputChannel = vscode.window.createOutputChannel('Trivx AI');
      outputChannel.show(true);
      outputChannel.appendLine(`Q: ${question}\n`);
      outputChannel.appendLine('A: ');

      try {
        await aiService.streamMessage(question, undefined, {
          onToken: (token: string) => {
            outputChannel.append(token);
          },
          onComplete: () => {
            outputChannel.appendLine('\n');
          },
          onError: (error: Error) => {
            outputChannel.appendLine(`\nError: ${error.message}`);
          },
        });
      } catch (error: any) {
        vscode.window.showErrorMessage(`AI request failed: ${error.message}`);
      }
    })
  );
}
