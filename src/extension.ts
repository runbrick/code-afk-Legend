import * as vscode from 'vscode';
import { GameStateManager } from './gameStateManager';
import { IdleCodingGameProvider } from './gameViewProvider';
import { EditorListener } from './editorListener';

let gameStateManager: GameStateManager;
let gameProvider: IdleCodingGameProvider;
let editorListener: EditorListener;
let statusBarItem: vscode.StatusBarItem;
let gameLoop: NodeJS.Timeout;

/**
 * 扩展激活函数
 * @param context 扩展上下文
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('代码挂机传说插件已激活');

    // 初始化游戏状态管理器
    gameStateManager = new GameStateManager(context);

    // 初始化游戏界面提供者
    gameProvider = new IdleCodingGameProvider(context, gameStateManager);

    // 初始化编辑器监听器
    editorListener = new EditorListener(gameStateManager);

    // 注册侧边栏视图
    const treeDataProvider = vscode.window.registerTreeDataProvider('idleCodingGameView', gameProvider);

    // 注册命令
    const openGameCommand = vscode.commands.registerCommand('idleCodingGame.openGame', () => {
        gameProvider.openGamePanel();
    });

    const resetGameCommand = vscode.commands.registerCommand('idleCodingGame.resetGame', async () => {
        const result = await vscode.window.showWarningMessage(
            '确定要重置游戏吗？这将清除所有进度！',
            { modal: true },
            '确定重置',
            '取消'
        );

        if (result === '确定重置') {
            gameStateManager.resetGame();
            vscode.window.showInformationMessage('游戏已重置！');
        }
    });

    // 初始化状态栏
    initializeStatusBar();

    // 启动游戏主循环
    startGameLoop();

    // 添加到订阅列表
    context.subscriptions.push(
        treeDataProvider,
        openGameCommand,
        resetGameCommand,
        statusBarItem,
        ...editorListener.getDisposables()
    );
}

/**
 * 初始化状态栏显示
 */
function initializeStatusBar(): void {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'idleCodingGame.openGame';
    statusBarItem.tooltip = '点击打开代码挂机传说游戏面板';
    updateStatusBar();
    statusBarItem.show();
}

/**
 * 更新状态栏显示
 */
function updateStatusBar(): void {
    const gameState = gameStateManager.getGameState();
    statusBarItem.text = `$(code) LoC: ${Math.floor(gameState.resources.linesOfCode)} | 手速: ${gameState.stats.handSpeed}`;
}

/**
 * 启动游戏主循环
 */
function startGameLoop(): void {
    // 每秒执行一次游戏循环
    gameLoop = setInterval(() => {
        gameStateManager.updateGameState();
        updateStatusBar();
        gameProvider.notifyStateUpdate();
    }, 1000);
}

/**
 * 扩展停用函数
 */
export function deactivate() {
    if (gameLoop) {
        clearInterval(gameLoop);
    }

    if (gameStateManager) {
        gameStateManager.saveGameState();
    }

    console.log('代码挂机传说插件已停用');
}