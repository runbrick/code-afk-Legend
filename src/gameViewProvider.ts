import * as vscode from 'vscode';
import { GameStateManager } from './gameStateManager';
import * as path from 'path';

/**
 * 游戏视图提供者
 * 负责管理侧边栏的树形视图和Webview游戏面板
 */
export class IdleCodingGameProvider implements vscode.TreeDataProvider<GameTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<GameTreeItem | undefined | null | void> = new vscode.EventEmitter<GameTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<GameTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private context: vscode.ExtensionContext;
    private gameStateManager: GameStateManager;
    private currentPanel: vscode.WebviewPanel | undefined;

    constructor(context: vscode.ExtensionContext, gameStateManager: GameStateManager) {
        this.context = context;
        this.gameStateManager = gameStateManager;
    }

    /**
     * 刷新树形视图
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * 通知状态更新
     */
    public notifyStateUpdate(): void {
        this.refresh();
        if (this.currentPanel) {
            this.updateWebview();
        }
    }

    /**
     * 获取树形项
     */
    getTreeItem(element: GameTreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * 获取子项
     */
    getChildren(element?: GameTreeItem): Thenable<GameTreeItem[]> {
        if (!element) {
            return Promise.resolve(this.getRootItems());
        } else {
            return Promise.resolve(this.getChildItems(element));
        }
    }

    /**
     * 获取根级项目
     */
    private getRootItems(): GameTreeItem[] {
        const gameState = this.gameStateManager.getGameState();

        const items: GameTreeItem[] = [
            new GameTreeItem(
                `${gameState.character.name} (Lv.${gameState.character.level})`,
                vscode.TreeItemCollapsibleState.Collapsed,
                'character',
                `经验: ${gameState.character.experience}/${gameState.character.experienceToNext}`
            ),
            new GameTreeItem(
                '资源',
                vscode.TreeItemCollapsibleState.Collapsed,
                'resources',
                `LoC: ${Math.floor(gameState.resources.linesOfCode)}, Bug碎片: ${gameState.resources.bugFragments}`
            ),
            new GameTreeItem(
                '属性',
                vscode.TreeItemCollapsibleState.Collapsed,
                'stats',
                `算力: ${gameState.stats.computingPower}, 攻击: ${gameState.stats.attack}, 防御: ${gameState.stats.defense}`
            )
        ];

        // 如果正在战斗，显示战斗信息
        if (gameState.battle.isInBattle && gameState.battle.currentBug) {
            const bug = gameState.battle.currentBug;
            items.push(
                new GameTreeItem(
                    `⚔️ 战斗中: ${bug.name}`,
                    vscode.TreeItemCollapsibleState.None,
                    'battle',
                    `血量: ${bug.health}/${bug.maxHealth}`
                )
            );
        }

        return items;
    }

    /**
     * 获取子项目
     */
    private getChildItems(element: GameTreeItem): GameTreeItem[] {
        const gameState = this.gameStateManager.getGameState();

        switch (element.contextValue) {
            case 'character':
                return [
                    new GameTreeItem(`等级: ${gameState.character.level}`, vscode.TreeItemCollapsibleState.None),
                    new GameTreeItem(`经验: ${gameState.character.experience}/${gameState.character.experienceToNext}`, vscode.TreeItemCollapsibleState.None),
                    new GameTreeItem(`总游戏时间: ${Math.floor(gameState.statistics.totalPlayTime / 60)}分钟`, vscode.TreeItemCollapsibleState.None)
                ];

            case 'resources':
                return [
                    new GameTreeItem(`代码行数: ${Math.floor(gameState.resources.linesOfCode)}`, vscode.TreeItemCollapsibleState.None),
                    new GameTreeItem(`Bug碎片: ${gameState.resources.bugFragments}`, vscode.TreeItemCollapsibleState.None),
                    new GameTreeItem(`每秒LoC: ${gameState.stats.computingPower}`, vscode.TreeItemCollapsibleState.None)
                ];

            case 'stats':
                return [
                    new GameTreeItem(`算力: ${gameState.stats.computingPower} (升级费用: ${gameState.upgradeCosts.computingPower} LoC)`, vscode.TreeItemCollapsibleState.None),
                    new GameTreeItem(`攻击力: ${gameState.stats.attack} (升级费用: ${gameState.upgradeCosts.attack} LoC)`, vscode.TreeItemCollapsibleState.None),
                    new GameTreeItem(`防御力: ${gameState.stats.defense} (升级费用: ${gameState.upgradeCosts.defense} LoC)`, vscode.TreeItemCollapsibleState.None)
                ];

            default:
                return [];
        }
    }

    /**
     * 打开游戏面板
     */
    public openGamePanel(): void {
        if (this.currentPanel) {
            this.currentPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        // 创建并显示webview面板
        this.currentPanel = vscode.window.createWebviewPanel(
            'idleCodingGame',
            '代码挂机传说',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'media'))]
            }
        );

        // 设置webview内容
        this.currentPanel.webview.html = this.getWebviewContent();

        // 处理webview消息
        this.currentPanel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'buyUpgrade':
                        this.handleBuyUpgrade(message.upgradeType);
                        break;
                    case 'refresh':
                        this.updateWebview();
                        break;
                    default:
                        console.log('Unknown command:', message.command);
                }
            },
            undefined,
            this.context.subscriptions
        );

        // 当面板被关闭时清理
        this.currentPanel.onDidDispose(
            () => {
                this.currentPanel = undefined;
            },
            null,
            this.context.subscriptions
        );

        // 初始更新webview
        this.updateWebview();
    }

    /**
     * 处理购买升级
     */
    private handleBuyUpgrade(upgradeType: 'computingPower' | 'attack' | 'defense'): void {
        const success = this.gameStateManager.buyUpgrade(upgradeType);

        if (success) {
            vscode.window.showInformationMessage(`成功升级${this.getUpgradeDisplayName(upgradeType)}！`);
            this.updateWebview();
            this.refresh();
        } else {
            vscode.window.showWarningMessage('LoC不足，无法升级！');
        }
    }

    /**
     * 获取升级项的显示名称
     */
    private getUpgradeDisplayName(upgradeType: string): string {
        const names = {
            'computingPower': '算力',
            'attack': '攻击力',
            'defense': '防御力'
        };
        return names[upgradeType as keyof typeof names] || upgradeType;
    }

    /**
     * 更新webview内容
     */
    private updateWebview(): void {
        if (this.currentPanel) {
            const gameState = this.gameStateManager.getGameState();
            this.currentPanel.webview.postMessage({
                command: 'updateGameState',
                gameState: gameState
            });
        }
    }

    /**
     * 获取webview的HTML内容
     */
    private getWebviewContent(): string {
        const gameState = this.gameStateManager.getGameState();

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>代码挂机传说</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }

        .game-container {
            max-width: 800px;
            margin: 0 auto;
        }

        .section {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-sideBar-border);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
        }

        .section h2 {
            margin-top: 0;
            color: var(--vscode-titleBar-activeForeground);
            border-bottom: 2px solid var(--vscode-titleBar-border);
            padding-bottom: 8px;
        }

        .character-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .stat-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid var(--vscode-sideBar-border);
        }

        .stat-item:last-child {
            border-bottom: none;
        }

        .stat-value {
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }

        .progress-bar {
            width: 100%;
            height: 20px;
            background-color: var(--vscode-editor-background);
            border-radius: 10px;
            overflow: hidden;
            margin-top: 8px;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--vscode-progressBar-background), var(--vscode-textLink-foreground));
            transition: width 0.3s ease;
        }

        .upgrade-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }

        .upgrade-item {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            padding: 12px;
            text-align: center;
        }

        .upgrade-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 8px;
            width: 100%;
            transition: background-color 0.2s;
        }

        .upgrade-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .upgrade-button:disabled {
            background-color: var(--vscode-button-secondaryBackground);
            cursor: not-allowed;
            opacity: 0.6;
        }

        .battle-section {
            background: linear-gradient(135deg, #ff6b6b, #ee5a24);
            color: white;
        }

        .battle-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .bug-health {
            flex-grow: 1;
            margin-left: 16px;
        }

        .health-bar {
            width: 100%;
            height: 16px;
            background-color: rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            overflow: hidden;
            margin-top: 4px;
        }

        .health-fill {
            height: 100%;
            background: linear-gradient(90deg, #ff4757, #ff3838);
            transition: width 0.5s ease;
        }

        .resource-display {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 16px;
        }

        .resource-item {
            text-align: center;
            padding: 12px;
            background-color: var(--vscode-editor-background);
            border-radius: 6px;
            border: 1px solid var(--vscode-input-border);
        }

        .resource-value {
            font-size: 24px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }

        .resource-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }

        .pulse {
            animation: pulse 2s infinite;
        }
    </style>
</head>
<body>
    <div class="game-container">
        <div class="section">
            <h2>🎮 代码挂机传说</h2>
            <div class="character-info">
                <div>
                    <div class="stat-item">
                        <span>角色名称:</span>
                        <span class="stat-value" id="characterName">${gameState.character.name}</span>
                    </div>
                    <div class="stat-item">
                        <span>等级:</span>
                        <span class="stat-value" id="characterLevel">${gameState.character.level}</span>
                    </div>
                    <div class="stat-item">
                        <span>经验:</span>
                        <span class="stat-value" id="characterExp">${gameState.character.experience}/${gameState.character.experienceToNext}</span>
                    </div>
                </div>
                <div>
                    <div class="stat-item">
                        <span>算力:</span>
                        <span class="stat-value" id="computingPower">${gameState.stats.computingPower}</span>
                    </div>
                    <div class="stat-item">
                        <span>攻击力:</span>
                        <span class="stat-value" id="attack">${gameState.stats.attack}</span>
                    </div>
                    <div class="stat-item">
                        <span>防御力:</span>
                        <span class="stat-value" id="defense">${gameState.stats.defense}</span>
                    </div>
                </div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" id="expProgressBar" style="width: ${(gameState.character.experience / gameState.character.experienceToNext) * 100}%"></div>
            </div>
        </div>

        <div class="section">
            <h2>💰 资源</h2>
            <div class="resource-display">
                <div class="resource-item">
                    <div class="resource-value" id="linesOfCode">${Math.floor(gameState.resources.linesOfCode)}</div>
                    <div class="resource-label">代码行数 (LoC)</div>
                </div>
                <div class="resource-item">
                    <div class="resource-value" id="bugFragments">${gameState.resources.bugFragments}</div>
                    <div class="resource-label">Bug碎片</div>
                </div>
            </div>
            <div class="stat-item">
                <span>每秒生成:</span>
                <span class="stat-value">${gameState.stats.computingPower} LoC/秒</span>
            </div>
        </div>

        ${gameState.battle.isInBattle && gameState.battle.currentBug ? `
        <div class="section battle-section">
            <h2>⚔️ 战斗中</h2>
            <div class="battle-info">
                <div>
                    <h3 id="bugName">${gameState.battle.currentBug.name}</h3>
                    <p>攻击: ${gameState.battle.currentBug.attack} | 防御: ${gameState.battle.currentBug.defense}</p>
                </div>
                <div class="bug-health">
                    <div>血量: <span id="bugHealth">${gameState.battle.currentBug.health}</span>/<span id="bugMaxHealth">${gameState.battle.currentBug.maxHealth}</span></div>
                    <div class="health-bar">
                        <div class="health-fill" id="bugHealthBar" style="width: ${(gameState.battle.currentBug.health / gameState.battle.currentBug.maxHealth) * 100}%"></div>
                    </div>
                </div>
            </div>
            <p>战斗自动进行中...</p>
        </div>
        ` : ''}

        <div class="section">
            <h2>⬆️ 升级</h2>
            <div class="upgrade-section">
                <div class="upgrade-item">
                    <h4>提升算力</h4>
                    <p>增加每秒LoC产量</p>
                    <p>费用: <span class="stat-value">${gameState.upgradeCosts.computingPower}</span> LoC</p>
                    <button class="upgrade-button" onclick="buyUpgrade('computingPower')"
                        ${gameState.resources.linesOfCode < gameState.upgradeCosts.computingPower ? 'disabled' : ''}>
                        升级算力
                    </button>
                </div>
                <div class="upgrade-item">
                    <h4>提升攻击</h4>
                    <p>更快击败Bug怪物</p>
                    <p>费用: <span class="stat-value">${gameState.upgradeCosts.attack}</span> LoC</p>
                    <button class="upgrade-button" onclick="buyUpgrade('attack')"
                        ${gameState.resources.linesOfCode < gameState.upgradeCosts.attack ? 'disabled' : ''}>
                        升级攻击
                    </button>
                </div>
                <div class="upgrade-item">
                    <h4>提升防御</h4>
                    <p>减少受到的伤害</p>
                    <p>费用: <span class="stat-value">${gameState.upgradeCosts.defense}</span> LoC</p>
                    <button class="upgrade-button" onclick="buyUpgrade('defense')"
                        ${gameState.resources.linesOfCode < gameState.upgradeCosts.defense ? 'disabled' : ''}>
                        升级防御
                    </button>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>📊 统计</h2>
            <div class="stat-item">
                <span>总计生成LoC:</span>
                <span class="stat-value">${Math.floor(gameState.statistics.totalLinesGenerated)}</span>
            </div>
            <div class="stat-item">
                <span>击败Bug数量:</span>
                <span class="stat-value">${gameState.statistics.totalBugsDefeated}</span>
            </div>
            <div class="stat-item">
                <span>总游戏时间:</span>
                <span class="stat-value">${Math.floor(gameState.statistics.totalPlayTime / 60)}分${gameState.statistics.totalPlayTime % 60}秒</span>
            </div>
            <div class="stat-item">
                <span>敲击次数:</span>
                <span class="stat-value">${gameState.statistics.keystrokes}</span>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function buyUpgrade(upgradeType) {
            vscode.postMessage({
                command: 'buyUpgrade',
                upgradeType: upgradeType
            });
        }

        // 监听来自扩展的消息
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'updateGameState':
                    updateGameState(message.gameState);
                    break;
            }
        });

        function updateGameState(gameState) {
            // 更新角色信息
            document.getElementById('characterName').textContent = gameState.character.name;
            document.getElementById('characterLevel').textContent = gameState.character.level;
            document.getElementById('characterExp').textContent = gameState.character.experience + '/' + gameState.character.experienceToNext;

            // 更新属性
            document.getElementById('computingPower').textContent = gameState.stats.computingPower;
            document.getElementById('attack').textContent = gameState.stats.attack;
            document.getElementById('defense').textContent = gameState.stats.defense;

            // 更新经验条
            const expProgress = (gameState.character.experience / gameState.character.experienceToNext) * 100;
            document.getElementById('expProgressBar').style.width = expProgress + '%';

            // 更新资源
            document.getElementById('linesOfCode').textContent = Math.floor(gameState.resources.linesOfCode);
            document.getElementById('bugFragments').textContent = gameState.resources.bugFragments;

            // 更新升级按钮状态
            updateUpgradeButtons(gameState);

            // 更新战斗信息（如果存在）
            if (gameState.battle.isInBattle && gameState.battle.currentBug) {
                const bugNameElement = document.getElementById('bugName');
                const bugHealthElement = document.getElementById('bugHealth');
                const bugMaxHealthElement = document.getElementById('bugMaxHealth');
                const bugHealthBarElement = document.getElementById('bugHealthBar');

                if (bugNameElement) bugNameElement.textContent = gameState.battle.currentBug.name;
                if (bugHealthElement) bugHealthElement.textContent = gameState.battle.currentBug.health;
                if (bugMaxHealthElement) bugMaxHealthElement.textContent = gameState.battle.currentBug.maxHealth;
                if (bugHealthBarElement) {
                    const healthProgress = (gameState.battle.currentBug.health / gameState.battle.currentBug.maxHealth) * 100;
                    bugHealthBarElement.style.width = healthProgress + '%';
                }
            }
        }

        function updateUpgradeButtons(gameState) {
            // 更新升级算力按钮
            const computingPowerButton = document.querySelector('button[onclick*="computingPower"]');
            if (computingPowerButton) {
                computingPowerButton.disabled = gameState.resources.linesOfCode < gameState.upgradeCosts.computingPower;
            }

            // 更新升级攻击按钮
            const attackButton = document.querySelector('button[onclick*="attack"]');
            if (attackButton) {
                attackButton.disabled = gameState.resources.linesOfCode < gameState.upgradeCosts.attack;
            }

            // 更新升级防御按钮
            const defenseButton = document.querySelector('button[onclick*="defense"]');
            if (defenseButton) {
                defenseButton.disabled = gameState.resources.linesOfCode < gameState.upgradeCosts.defense;
            }

            // 更新升级费用显示
            const computingPowerCostElement = document.querySelector('.upgrade-item:nth-child(1) .stat-value');
            if (computingPowerCostElement) {
                computingPowerCostElement.textContent = gameState.upgradeCosts.computingPower;
            }

            const attackCostElement = document.querySelector('.upgrade-item:nth-child(2) .stat-value');
            if (attackCostElement) {
                attackCostElement.textContent = gameState.upgradeCosts.attack;
            }

            const defenseCostElement = document.querySelector('.upgrade-item:nth-child(3) .stat-value');
            if (defenseCostElement) {
                defenseCostElement.textContent = gameState.upgradeCosts.defense;
            }
        }

        // 定期请求更新
        setInterval(() => {
            vscode.postMessage({ command: 'refresh' });
        }, 1000);
    </script>
</body>
</html>`;
    }
}

/**
 * 游戏树形项
 */
class GameTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue?: string,
        public readonly tooltip?: string,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.tooltip = tooltip || this.label;
        this.contextValue = contextValue;
    }
}