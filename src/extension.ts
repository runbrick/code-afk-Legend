import * as vscode from 'vscode';
import { GameStateManager } from './gameStateManager';
import { IdleCodingGameProvider } from './gameViewProvider';
import { EditorListener } from './editorListener';
import { I18nManager, t } from './i18n/i18nManager';

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

    // 初始化多语言管理器
    const i18nManager = I18nManager.getInstance(context);

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
            t('commands.resetWarning'),
            { modal: true },
            t('commands.resetConfirm'),
            t('commands.resetCancel')
        );

        if (result === t('commands.resetConfirm')) {
            gameStateManager.resetGame();
            vscode.window.showInformationMessage(t('commands.resetSuccess'));
        }
    });

    const changeLanguageCommand = vscode.commands.registerCommand('idleCodingGame.changeLanguage', async () => {
        const i18nManager = I18nManager.getInstance();
        const availableLanguages = i18nManager.getAvailableLanguages();

        const items = availableLanguages.map(lang => ({
            label: lang.name,
            description: lang.code,
            picked: lang.code === i18nManager.getCurrentLanguage()
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: t('ui.language')
        });

        if (selected) {
            const success = await i18nManager.setLanguage(selected.description!);
            if (success) {
                vscode.window.showInformationMessage(
                    `Language changed to ${selected.label}. Please reload VS Code to apply changes.`
                );
            }
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
        changeLanguageCommand,
        statusBarItem,
        ...editorListener.getDisposables()
    );

    // 返回API供其他扩展使用
    return {
        registerLanguagePackage: i18nManager.registerLanguagePackage.bind(i18nManager),
        unregisterLanguagePackage: i18nManager.unregisterLanguagePackage.bind(i18nManager),
        getCurrentLanguage: i18nManager.getCurrentLanguage.bind(i18nManager),
        setLanguage: i18nManager.setLanguage.bind(i18nManager)
    };
}

/**
 * 初始化状态栏显示
 */
function initializeStatusBar(): void {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'idleCodingGame.openGame';
    statusBarItem.tooltip = t('commands.openGame');
    updateStatusBar();
    statusBarItem.show();
}

/**
 * 更新状态栏显示
 */
function updateStatusBar(): void {
    const gameState = gameStateManager.getGameState();
    statusBarItem.text = `$(code) ${t('resources.linesOfCode')}: ${Math.floor(gameState.resources.linesOfCode)} | ${t('stats.computingPower')}: ${gameState.stats.computingPower}`;
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