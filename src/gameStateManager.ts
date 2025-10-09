import * as vscode from 'vscode';

/**
 * 游戏状态接口定义
 */
export interface GameState {
    /** 角色信息 */
    character: {
        name: string;
        level: number;
        experience: number;
        experienceToNext: number;
    };
    /** 游戏资源 */
    resources: {
        linesOfCode: number;
        bugFragments: number;
    };
    /** 角色属性 */
    stats: {
        handSpeed: number;
        algorithm: number;
        iteration: number;
    };
    /** 升级成本 */
    upgradeCosts: {
        handSpeed: number;
        algorithm: number;
        iteration: number;
    };
    /** 装备信息 */
    equipment: {
        keyboard: { level: number; owned: boolean };
        ideExtension: { level: number; owned: boolean };
        debugger: { level: number; owned: boolean };
        coffeeMachine: { level: number; owned: boolean };
    };
    /** 游戏统计 */
    statistics: {
        totalLinesGenerated: number;
        totalBugsDefeated: number;
        totalPlayTime: number;
        keystrokes: number;
        filesOpened: number;
        filesSaved: number;
    };
    /** 战斗状态 */
    battle: {
        currentBug: Bug | null;
        isInBattle: boolean;
    };
    /** 游戏设置 */
    settings: {
        autoSave: boolean;
        showNotifications: boolean;
    };
}

/**
 * Bug怪物接口定义
 */
export interface Bug {
    name: string;
    type: 'NullPointerException' | 'MemoryLeak' | 'InfiniteLoop' | 'SyntaxError' | 'RuntimeError';
    health: number;
    maxHealth: number;
    algorithm: number;
    iteration: number;
    reward: {
        linesOfCode: number;
        bugFragments: number;
        experience: number;
    };
}

/**
 * 游戏状态管理器
 * 负责管理游戏数据的存储、读取和更新
 */
export class GameStateManager {
    private context: vscode.ExtensionContext;
    private gameState: GameState;
    private saveKey = 'idleCodingGame.gameState';

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.gameState = this.loadGameState();
    }

    /**
     * 获取当前游戏状态
     */
    public getGameState(): GameState {
        return { ...this.gameState };
    }

    /**
     * 更新游戏状态（每秒调用一次的主循环）
     */
    public updateGameState(): void {
        // 自动生成代码行数
        const locPerSecond = this.calculateLocPerSecond();
        this.gameState.resources.linesOfCode += locPerSecond;
        this.gameState.statistics.totalLinesGenerated += locPerSecond;

        // 更新游戏时间
        this.gameState.statistics.totalPlayTime += 1;

        // 处理战斗
        this.processBattle();

        // 检查是否需要生成新的Bug
        if (!this.gameState.battle.isInBattle && Math.random() < 0.1) {
            this.spawnRandomBug();
        }

        // 检查角色升级
        this.checkLevelUp();

        // 自动保存游戏状态
        if (this.gameState.settings.autoSave) {
            this.saveGameState();
        }
    }

    /**
     * 计算每秒生成的代码行数
     */
    private calculateLocPerSecond(): number {
        let baseRate = this.gameState.stats.handSpeed;

        // 装备加成
        if (this.gameState.equipment.ideExtension.owned) {
            baseRate *= (1 + this.gameState.equipment.ideExtension.level * 0.1);
        }

        return baseRate;
    }

    /**
     * 计算击败Bug时获得的碎片数量（包括迭代版本加成）
     */
    public calculateFragmentsPerBug(baseBugFragments: number): number {
        const fragmentBonus = Math.floor(baseBugFragments * this.gameState.stats.iteration * 0.1);
        return baseBugFragments + fragmentBonus;
    }

    /**
     * 处理战斗逻辑
     */
    private processBattle(): void {
        if (!this.gameState.battle.isInBattle || !this.gameState.battle.currentBug) {
            return;
        }

        const bug = this.gameState.battle.currentBug;
        const playerAlgorithm = this.gameState.stats.algorithm;

        // 玩家攻击Bug
        const damage = Math.max(1, playerAlgorithm - bug.iteration);
        bug.health -= damage;

        if (bug.health <= 0) {
            // Bug被击败
            this.defeatBug(bug);
        } else {
            // Bug攻击玩家（暂时没有玩家血量系统，可以后续添加）
            // const bugDamage = Math.max(1, bug.algorithm - this.gameState.stats.iteration);
        }
    }

    /**
     * 击败Bug后的奖励处理
     */
    private defeatBug(bug: Bug): void {
        this.gameState.resources.linesOfCode += bug.reward.linesOfCode;

        // 根据迭代版本增加碎片奖励
        const fragmentBonus = Math.floor(bug.reward.bugFragments * this.gameState.stats.iteration * 0.1);
        const totalFragments = bug.reward.bugFragments + fragmentBonus;
        this.gameState.resources.bugFragments += totalFragments;

        this.gameState.character.experience += bug.reward.experience;
        this.gameState.statistics.totalBugsDefeated++;

        this.gameState.battle.currentBug = null;
        this.gameState.battle.isInBattle = false;

        if (this.gameState.settings.showNotifications) {
            vscode.window.showInformationMessage(
                `击败了 ${bug.name}！获得 ${bug.reward.linesOfCode} LoC, ${totalFragments} Bug碎片`
            );
        }
    }

    /**
     * 生成随机Bug
     */
    private spawnRandomBug(): void {
        const bugTypes: Bug['type'][] = ['NullPointerException', 'MemoryLeak', 'InfiniteLoop', 'SyntaxError', 'RuntimeError'];
        const randomType = bugTypes[Math.floor(Math.random() * bugTypes.length)];

        const bug = this.createBug(randomType);
        this.gameState.battle.currentBug = bug;
        this.gameState.battle.isInBattle = true;
    }

    /**
     * 创建指定类型的Bug
     */
    private createBug(type: Bug['type']): Bug {
        const baseHealth = 10 + this.gameState.character.level * 5;
        const baseAlgorithm = 5 + this.gameState.character.level * 2;
        const baseReward = Math.max(1, Math.floor(this.gameState.character.level / 2));

        return {
            name: this.getBugDisplayName(type),
            type,
            health: baseHealth,
            maxHealth: baseHealth,
            algorithm: baseAlgorithm,
            iteration: Math.floor(baseAlgorithm * 0.2),
            reward: {
                linesOfCode: baseReward * 10,
                bugFragments: baseReward,
                experience: baseReward * 5
            }
        };
    }

    /**
     * 获取Bug的显示名称
     */
    private getBugDisplayName(type: Bug['type']): string {
        const names = {
            'NullPointerException': '空指针异常怪',
            'MemoryLeak': '内存泄漏虫',
            'InfiniteLoop': '死循环魔',
            'SyntaxError': '语法错误精',
            'RuntimeError': '运行时异常兽'
        };
        return names[type];
    }

    /**
     * 检查角色升级
     */
    private checkLevelUp(): void {
        while (this.gameState.character.experience >= this.gameState.character.experienceToNext) {
            this.gameState.character.experience -= this.gameState.character.experienceToNext;
            this.gameState.character.level++;
            this.gameState.character.experienceToNext = this.calculateExperienceForNextLevel();

            // 升级时提升基础属性
            this.gameState.stats.handSpeed += 1;
            this.gameState.stats.algorithm += 2;
            this.gameState.stats.iteration += 1;

            if (this.gameState.settings.showNotifications) {
                vscode.window.showInformationMessage(`恭喜！升级到 ${this.gameState.character.level} 级！`);
            }
        }
    }

    /**
     * 计算下一级所需经验
     */
    private calculateExperienceForNextLevel(): number {
        return 100 + (this.gameState.character.level - 1) * 50;
    }

    /**
     * 购买属性升级
     */
    public buyUpgrade(upgradeType: 'handSpeed' | 'algorithm' | 'iteration'): boolean {
        const cost = this.gameState.upgradeCosts[upgradeType];

        if (this.gameState.resources.linesOfCode >= cost) {
            this.gameState.resources.linesOfCode -= cost;
            this.gameState.stats[upgradeType] += upgradeType === 'handSpeed' ? 1 : 2;
            this.gameState.upgradeCosts[upgradeType] = Math.floor(cost * 1.5);
            return true;
        }

        return false;
    }

    /**
     * 处理编辑器交互事件
     */
    public onEditorInteraction(type: 'keystroke' | 'fileOpen' | 'fileSave', data?: any): void {
        switch (type) {
            case 'keystroke':
                this.gameState.statistics.keystrokes++;
                // 每次敲键都有小概率获得额外LoC
                if (Math.random() < 0.1) {
                    let bonus = 1;
                    if (this.gameState.equipment.keyboard.owned) {
                        bonus *= (1 + this.gameState.equipment.keyboard.level * 0.2);
                    }
                    this.gameState.resources.linesOfCode += bonus;
                }
                break;
            case 'fileOpen':
                this.gameState.statistics.filesOpened++;
                break;
            case 'fileSave':
                this.gameState.statistics.filesSaved++;
                // 保存文件时有概率获得经验和LoC奖励
                const saveBonus = 5 + Math.floor(Math.random() * 10);
                this.gameState.resources.linesOfCode += saveBonus;
                this.gameState.character.experience += 2;
                break;
        }
    }

    /**
     * 加载游戏状态
     */
    private loadGameState(): GameState {
        const savedState = this.context.globalState.get<any>(this.saveKey);

        if (savedState) {
            // 数据迁移：处理旧版本的变量名
            if (savedState.stats) {
                if (savedState.stats.computingPower !== undefined) {
                    savedState.stats.handSpeed = savedState.stats.computingPower;
                    delete savedState.stats.computingPower;
                }
                if (savedState.stats.attack !== undefined) {
                    savedState.stats.algorithm = savedState.stats.attack;
                    delete savedState.stats.attack;
                }
                if (savedState.stats.defense !== undefined) {
                    savedState.stats.iteration = savedState.stats.defense;
                    delete savedState.stats.defense;
                }
            }

            if (savedState.upgradeCosts) {
                if (savedState.upgradeCosts.computingPower !== undefined) {
                    savedState.upgradeCosts.handSpeed = savedState.upgradeCosts.computingPower;
                    delete savedState.upgradeCosts.computingPower;
                }
                if (savedState.upgradeCosts.attack !== undefined) {
                    savedState.upgradeCosts.algorithm = savedState.upgradeCosts.attack;
                    delete savedState.upgradeCosts.attack;
                }
                if (savedState.upgradeCosts.defense !== undefined) {
                    savedState.upgradeCosts.iteration = savedState.upgradeCosts.defense;
                    delete savedState.upgradeCosts.defense;
                }
            }

            if (savedState.battle?.currentBug) {
                const bug = savedState.battle.currentBug;
                if (bug.attack !== undefined) {
                    bug.algorithm = bug.attack;
                    delete bug.attack;
                }
                if (bug.defense !== undefined) {
                    bug.iteration = bug.defense;
                    delete bug.defense;
                }
            }

            return savedState as GameState;
        }

        return this.createDefaultGameState();
    }

    /**
     * 保存游戏状态
     */
    public saveGameState(): void {
        this.context.globalState.update(this.saveKey, this.gameState);
    }

    /**
     * 重置游戏
     */
    public resetGame(): void {
        this.gameState = this.createDefaultGameState();
        this.saveGameState();
    }

    /**
     * 创建默认游戏状态
     */
    private createDefaultGameState(): GameState {
        return {
            character: {
                name: '代码勇者',
                level: 1,
                experience: 0,
                experienceToNext: 100
            },
            resources: {
                linesOfCode: 0,
                bugFragments: 0
            },
            stats: {
                handSpeed: 1,
                algorithm: 5,
                iteration: 3
            },
            upgradeCosts: {
                handSpeed: 50,
                algorithm: 30,
                iteration: 40
            },
            equipment: {
                keyboard: { level: 1, owned: false },
                ideExtension: { level: 1, owned: false },
                debugger: { level: 1, owned: false },
                coffeeMachine: { level: 1, owned: false }
            },
            statistics: {
                totalLinesGenerated: 0,
                totalBugsDefeated: 0,
                totalPlayTime: 0,
                keystrokes: 0,
                filesOpened: 0,
                filesSaved: 0
            },
            battle: {
                currentBug: null,
                isInBattle: false
            },
            settings: {
                autoSave: true,
                showNotifications: true
            }
        };
    }
}