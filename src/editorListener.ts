import * as vscode from 'vscode';
import { GameStateManager } from './gameStateManager';

/**
 * 编辑器事件监听器
 * 负责监听VS Code的各种编辑器事件，并将这些事件转化为游戏中的互动
 */
export class EditorListener {
    private gameStateManager: GameStateManager;
    private disposables: vscode.Disposable[] = [];

    constructor(gameStateManager: GameStateManager) {
        this.gameStateManager = gameStateManager;
        this.setupEventListeners();
    }

    /**
     * 设置所有事件监听器
     */
    private setupEventListeners(): void {
        // 监听文档内容变化事件
        const textDocumentChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
            this.onTextDocumentChange(event);
        });

        // 监听文档打开事件
        const textDocumentOpenListener = vscode.workspace.onDidOpenTextDocument((document) => {
            this.onTextDocumentOpen(document);
        });

        // 监听文档保存事件
        const textDocumentSaveListener = vscode.workspace.onDidSaveTextDocument((document) => {
            this.onTextDocumentSave(document);
        });

        // 监听活动编辑器切换事件
        const activeEditorChangeListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
            this.onActiveEditorChange(editor);
        });

        // 监听工作区文件夹变化事件
        const workspaceFoldersChangeListener = vscode.workspace.onDidChangeWorkspaceFolders((event) => {
            this.onWorkspaceFoldersChange(event);
        });

        // 添加到disposables数组中，用于清理
        this.disposables.push(
            textDocumentChangeListener,
            textDocumentOpenListener,
            textDocumentSaveListener,
            activeEditorChangeListener,
            workspaceFoldersChangeListener
        );
    }

    /**
     * 处理文档内容变化事件
     * 每次敲击键盘都会触发此事件
     */
    private onTextDocumentChange(event: vscode.TextDocumentChangeEvent): void {
        // 过滤掉非用户操作的变化（比如格式化等自动变化）
        if (event.contentChanges.length === 0) {
            return;
        }

        // 计算实际增加的字符数
        let totalCharactersAdded = 0;
        for (const change of event.contentChanges) {
            const addedText = change.text;
            const removedText = change.rangeLength;

            // 计算净增加的字符数
            const netChange = addedText.length - removedText;
            if (netChange > 0) {
                totalCharactersAdded += netChange;
            }
        }

        // 根据文件类型给予不同的奖励加成
        const fileExtension = this.getFileExtension(event.document.fileName);
        const multiplier = this.getFileTypeMultiplier(fileExtension);

        // 触发游戏事件
        for (let i = 0; i < totalCharactersAdded; i++) {
            this.gameStateManager.onEditorInteraction('keystroke', {
                fileType: fileExtension,
                multiplier: multiplier,
                document: event.document.fileName
            });
        }

        // 检查是否触发特殊事件
        this.checkSpecialEvents(event);
    }

    /**
     * 处理文档打开事件
     */
    private onTextDocumentOpen(document: vscode.TextDocument): void {
        const fileExtension = this.getFileExtension(document.fileName);

        this.gameStateManager.onEditorInteraction('fileOpen', {
            fileType: fileExtension,
            fileName: document.fileName,
            lineCount: document.lineCount
        });

        // 显示欢迎消息（仅在第一次打开特定类型文件时）
        this.showWelcomeMessage(fileExtension);
    }

    /**
     * 处理文档保存事件
     */
    private onTextDocumentSave(document: vscode.TextDocument): void {
        const fileExtension = this.getFileExtension(document.fileName);

        this.gameStateManager.onEditorInteraction('fileSave', {
            fileType: fileExtension,
            fileName: document.fileName,
            lineCount: document.lineCount
        });

        // 检查是否触发特殊的保存事件
        this.checkSaveEvents(document, fileExtension);
    }

    /**
     * 处理活动编辑器切换事件
     */
    private onActiveEditorChange(editor: vscode.TextEditor | undefined): void {
        if (!editor) {
            return;
        }

        const fileExtension = this.getFileExtension(editor.document.fileName);

        // 切换到不同类型的文件时可能触发特殊事件
        this.checkEditorSwitchEvents(fileExtension);
    }

    /**
     * 处理工作区文件夹变化事件
     */
    private onWorkspaceFoldersChange(event: vscode.WorkspaceFoldersChangeEvent): void {
        // 当打开新的工作区时，可能会有特殊奖励
        if (event.added.length > 0) {
            // 给予打开新项目的奖励
            // 这里可以根据需要添加具体逻辑
        }
    }

    /**
     * 获取文件扩展名
     */
    private getFileExtension(fileName: string): string {
        const lastDot = fileName.lastIndexOf('.');
        return lastDot === -1 ? '' : fileName.substring(lastDot).toLowerCase();
    }

    /**
     * 根据文件类型获取奖励倍数
     */
    private getFileTypeMultiplier(extension: string): number {
        const multipliers: Record<string, number> = {
            '.ts': 1.5,    // TypeScript
            '.js': 1.3,    // JavaScript
            '.py': 1.4,    // Python
            '.java': 1.3,  // Java
            '.cpp': 1.6,   // C++
            '.c': 1.5,     // C
            '.go': 1.4,    // Go
            '.rust': 1.7,  // Rust (最难的语言，给最高奖励)
            '.html': 1.1,  // HTML
            '.css': 1.1,   // CSS
            '.json': 1.0,  // JSON
            '.md': 0.8,    // Markdown (文档，奖励较少)
            '.txt': 0.5,   // 纯文本
            '': 1.0        // 无扩展名文件
        };

        return multipliers[extension] || 1.0;
    }

    /**
     * 检查特殊事件触发
     */
    private checkSpecialEvents(event: vscode.TextDocumentChangeEvent): void {
        const content = event.document.getText();
        const fileExtension = this.getFileExtension(event.document.fileName);

        // 检查是否包含特定的代码模式，触发相应的Bug出现
        const patterns = [
            { pattern: /null\./, bugType: 'NullPointerException' as const },
            { pattern: /while\s*\(\s*true\s*\)/, bugType: 'InfiniteLoop' as const },
            { pattern: /malloc\s*\(/, bugType: 'MemoryLeak' as const },
            { pattern: /console\.error/, bugType: 'RuntimeError' as const }
        ];

        for (const { pattern, bugType } of patterns) {
            if (pattern.test(content)) {
                // 有概率触发对应类型的Bug战斗
                if (Math.random() < 0.05) { // 5%概率
                    this.triggerSpecialBugEvent(bugType, fileExtension);
                }
            }
        }
    }

    /**
     * 检查保存事件
     */
    private checkSaveEvents(document: vscode.TextDocument, fileExtension: string): void {
        const lineCount = document.lineCount;

        // 保存大文件时给予额外奖励
        if (lineCount > 100) {
            const bonus = Math.floor(lineCount / 100) * 10;
            // 这里可以调用gameStateManager的方法给予额外奖励
        }

        // 检查是否是第一次保存特定类型的文件
        this.checkFirstSaveAchievement(fileExtension);
    }

    /**
     * 检查编辑器切换事件
     */
    private checkEditorSwitchEvents(fileExtension: string): void {
        // 频繁切换文件类型可能触发"多语言大师"类的成就
        // 这里可以添加相关逻辑
    }

    /**
     * 触发特殊Bug事件
     */
    private triggerSpecialBugEvent(bugType: 'NullPointerException' | 'InfiniteLoop' | 'MemoryLeak' | 'RuntimeError', fileExtension: string): void {
        // 显示特殊Bug出现的通知
        const bugNames = {
            'NullPointerException': '空指针异常怪',
            'InfiniteLoop': '死循环魔',
            'MemoryLeak': '内存泄漏虫',
            'RuntimeError': '运行时异常兽'
        };

        vscode.window.showWarningMessage(
            `检测到危险代码！${bugNames[bugType]} 出现了！`,
            '立即战斗',
            '忽略'
        ).then(selection => {
            if (selection === '立即战斗') {
                // 这里可以触发立即战斗逻辑
                // 或者打开游戏面板
                vscode.commands.executeCommand('idleCodingGame.openGame');
            }
        });
    }

    /**
     * 显示欢迎消息
     */
    private showWelcomeMessage(fileExtension: string): void {
        const welcomeMessages: Record<string, string> = {
            '.ts': '欢迎进入TypeScript的世界！类型安全为你的代码之旅保驾护航！',
            '.js': 'JavaScript世界欢迎你！灵活性与动态性的完美结合！',
            '.py': 'Python之路已开启！简洁优雅的代码等待你的创造！',
            '.java': '踏入Java殿堂！面向对象的强大力量在此展现！',
            '.cpp': 'C++战场！性能与控制的终极挑战！',
            '.rust': 'Rust领域！内存安全与零成本抽象的新纪元！'
        };

        const message = welcomeMessages[fileExtension];
        if (message && Math.random() < 0.1) { // 10%概率显示欢迎消息
            vscode.window.showInformationMessage(message);
        }
    }

    /**
     * 检查首次保存成就
     */
    private checkFirstSaveAchievement(fileExtension: string): void {
        // 这里可以实现首次保存特定类型文件的成就检查
        // 需要在游戏状态中记录已保存过的文件类型
    }

    /**
     * 获取所有Disposable对象，用于清理
     */
    public getDisposables(): vscode.Disposable[] {
        return this.disposables;
    }

    /**
     * 清理所有监听器
     */
    public dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
    }
}