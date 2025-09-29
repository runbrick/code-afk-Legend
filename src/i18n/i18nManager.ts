import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { LanguagePackage, LanguageInfo, TranslationParams } from './types';

/**
 * 多语言管理器
 * 负责管理游戏的多语言支持
 */
export class I18nManager {
    private static instance: I18nManager;
    private context: vscode.ExtensionContext;
    private currentLanguage: string = 'zh-CN';
    private languagePackages: Map<string, LanguagePackage> = new Map();
    private externalLanguagePackages: Map<string, LanguagePackage> = new Map();

    // 硬编码的语言包作为后备
    private fallbackLanguages: Map<string, LanguagePackage> = new Map([
        ['zh-CN', {
            game: {
                title: "代码挂机传说",
                character: {
                    defaultName: "编程新手",
                    level: "等级",
                    experience: "经验"
                }
            },
            ui: {
                resources: "资源",
                character: "角色属性",
                language: "选择语言",
                ignore: "忽略"
            },
            resources: {
                linesOfCode: "代码行数",
                bugFragments: "Bug碎片",
                generation: "生成速度",
                perSecond: "秒"
            },
            stats: {
                computingPower: "算力",
                attack: "攻击力",
                defense: "防御力",
                cost: "费用"
            },
            battle: {
                inBattle: "战斗中",
                health: "生命值",
                autoProgress: "战斗自动进行中...",
                fightNow: "立即战斗"
            },
            upgrade: {
                title: "升级",
                success: "成功升级了 {upgradeType}！",
                insufficient: "代码行数不足！",
                computingPower: {
                    name: "升级算力",
                    description: "提高每秒生成的代码行数",
                    button: "升级算力"
                },
                attack: {
                    name: "升级攻击力",
                    description: "在战斗中造成更多伤害",
                    button: "升级攻击"
                },
                defense: {
                    name: "升级防御力",
                    description: "减少来自Bug的伤害",
                    button: "升级防御"
                }
            },
            statistics: {
                title: "统计信息",
                totalLinesGenerated: "总生成代码行数",
                totalBugsDefeated: "总击败Bug数",
                totalPlayTime: "总游戏时间",
                keystrokes: "按键次数",
                minutes: "分钟",
                seconds: "秒"
            },
            bugs: {
                nullPointerException: "空指针异常怪",
                memoryLeak: "内存泄漏虫",
                infiniteLoop: "死循环魔",
                syntaxError: "语法错误精",
                runtimeError: "运行时异常兽"
            },
            notifications: {
                bugDefeated: "击败了 {bugName}！获得 {linesOfCode} 代码行数和 {bugFragments} Bug碎片！",
                levelUp: "等级提升！现在是 {level} 级！",
                dangerousCode: "检测到危险代码！{bugName} 出现了！"
            },
            commands: {
                openGame: "打开代码挂机传说",
                resetWarning: "确定要重置游戏吗？这将清除所有进度！",
                resetConfirm: "确认重置",
                resetCancel: "取消",
                resetSuccess: "游戏已重置！"
            },
            welcome: {
                typescript: "欢迎进入TypeScript的世界！类型安全为你的代码之旅保驾护航！",
                javascript: "JavaScript世界欢迎你！灵活性与动态性的完美结合！",
                python: "Python之路已开启！简洁优雅的代码等待你的创造！",
                java: "踏入Java殿堂！面向对象的强大力量在此展现！",
                cpp: "C++战场！性能与控制的终极挑战！",
                rust: "Rust领域！内存安全与零成本抽象的新纪元！"
            }
        }],
        ['en-US', {
            game: {
                title: "Code AFK Legend",
                character: {
                    defaultName: "Novice Programmer",
                    level: "Level",
                    experience: "Experience"
                }
            },
            ui: {
                resources: "Resources",
                character: "Character Stats",
                language: "Select Language",
                ignore: "Ignore"
            },
            resources: {
                linesOfCode: "Lines of Code",
                bugFragments: "Bug Fragments",
                generation: "Generation Rate",
                perSecond: "per second"
            },
            stats: {
                computingPower: "Computing Power",
                attack: "Attack",
                defense: "Defense",
                cost: "Cost"
            },
            battle: {
                inBattle: "In Battle",
                health: "Health",
                autoProgress: "Battle in progress...",
                fightNow: "Fight Now"
            },
            upgrade: {
                title: "Upgrades",
                success: "Successfully upgraded {upgradeType}!",
                insufficient: "Insufficient lines of code!",
                computingPower: {
                    name: "Upgrade Computing Power",
                    description: "Increase lines of code generated per second",
                    button: "Upgrade Computing"
                },
                attack: {
                    name: "Upgrade Attack",
                    description: "Deal more damage in battles",
                    button: "Upgrade Attack"
                },
                defense: {
                    name: "Upgrade Defense",
                    description: "Reduce damage taken from bugs",
                    button: "Upgrade Defense"
                }
            },
            statistics: {
                title: "Statistics",
                totalLinesGenerated: "Total Lines Generated",
                totalBugsDefeated: "Total Bugs Defeated",
                totalPlayTime: "Total Play Time",
                keystrokes: "Keystrokes",
                minutes: " minutes ",
                seconds: " seconds"
            },
            bugs: {
                nullPointerException: "NullPointer Beast",
                memoryLeak: "Memory Leak Bug",
                infiniteLoop: "Infinite Loop Demon",
                syntaxError: "Syntax Error Spirit",
                runtimeError: "Runtime Error Monster"
            },
            notifications: {
                bugDefeated: "Defeated {bugName}! Gained {linesOfCode} lines of code and {bugFragments} bug fragments!",
                levelUp: "Level up! Now level {level}!",
                dangerousCode: "Dangerous code detected! {bugName} has appeared!"
            },
            commands: {
                openGame: "Open Code AFK Legend",
                resetWarning: "Are you sure you want to reset the game? This will clear all progress!",
                resetConfirm: "Confirm Reset",
                resetCancel: "Cancel",
                resetSuccess: "Game has been reset!"
            },
            welcome: {
                typescript: "Welcome to the TypeScript world! Type safety guards your coding journey!",
                javascript: "JavaScript world welcomes you! The perfect combination of flexibility and dynamism!",
                python: "Python path has opened! Elegant and concise code awaits your creation!",
                java: "Enter the Java temple! The power of object-oriented programming is revealed here!",
                cpp: "C++ battlefield! The ultimate challenge of performance and control!",
                rust: "Rust domain! A new era of memory safety and zero-cost abstractions!"
            }
        }]
    ]);

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.detectVSCodeLanguage();
        this.loadLanguagePackages();
    }

    /**
     * 获取单例实例
     */
    public static getInstance(context?: vscode.ExtensionContext): I18nManager {
        if (!I18nManager.instance) {
            if (!context) {
                throw new Error('Context is required for first initialization');
            }
            I18nManager.instance = new I18nManager(context);
        }
        return I18nManager.instance;
    }

    /**
     * 检测VS Code的语言设置
     */
    private detectVSCodeLanguage(): void {
        const vscodeLanguage = vscode.env.language;
        console.log('[I18n] VS Code language detected:', vscodeLanguage);

        // 映射VS Code语言代码到我们的语言代码
        const languageMap: Record<string, string> = {
            'zh-cn': 'zh-CN',
            'zh-tw': 'zh-CN', // 繁体中文映射到简体中文
            'en': 'en-US',
            'en-us': 'en-US',
            'en-gb': 'en-US'
        };

        const mappedLanguage = languageMap[vscodeLanguage.toLowerCase()] || 'en-US';

        // 检查是否有保存的语言偏好
        const savedLanguage = this.context.globalState.get<string>('idleCodingGame.language');
        this.currentLanguage = savedLanguage || mappedLanguage;

        console.log('[I18n] Current language set to:', this.currentLanguage);
    }

    /**
     * 从文件系统加载语言包
     */
    private loadLanguagePackages(): void {
        try {
            const languagesDir = path.join(this.context.extensionPath, 'out', 'i18n', 'languages');
            console.log('[I18n] Loading language packages from:', languagesDir);

            if (fs.existsSync(languagesDir)) {
                const files = fs.readdirSync(languagesDir);

                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const langCode = path.basename(file, '.json');
                        const filePath = path.join(languagesDir, file);

                        try {
                            const content = fs.readFileSync(filePath, 'utf8');
                            const languagePackage = JSON.parse(content) as LanguagePackage;
                            this.languagePackages.set(langCode, languagePackage);
                            console.log('[I18n] Loaded language package:', langCode);
                        } catch (error) {
                            console.error(`[I18n] Failed to load language package ${langCode}:`, error);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[I18n] Failed to load language packages from file system:', error);
        }

        // 如果没有成功加载任何语言包，使用硬编码的后备包
        if (this.languagePackages.size === 0) {
            console.log('[I18n] Using fallback language packages');
            this.languagePackages = new Map(this.fallbackLanguages);
        }
    }

    /**
     * 获取翻译文本
     */
    public translate(key: string, params?: TranslationParams): string {
        const keys = key.split('.');
        let currentPackage = this.getCurrentLanguagePackage();

        // 遍历键路径
        let value: any = currentPackage;
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // 如果当前语言包中没有找到，尝试英语作为后备
                if (this.currentLanguage !== 'en-US') {
                    const fallbackPackage = this.languagePackages.get('en-US') || this.fallbackLanguages.get('en-US');
                    if (fallbackPackage) {
                        let fallbackValue: any = fallbackPackage;
                        for (const k2 of keys) {
                            if (fallbackValue && typeof fallbackValue === 'object' && k2 in fallbackValue) {
                                fallbackValue = fallbackValue[k2];
                            } else {
                                return key; // 返回原始键作为最后的后备
                            }
                        }
                        value = fallbackValue;
                        break;
                    }
                }
                return key; // 返回原始键作为后备
            }
        }

        if (typeof value !== 'string') {
            return key;
        }

        // 处理参数插值
        if (params) {
            return this.interpolate(value, params);
        }

        return value;
    }

    /**
     * 字符串插值处理
     */
    private interpolate(template: string, params: TranslationParams): string {
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            const value = params[key];
            return value !== undefined ? String(value) : match;
        });
    }

    /**
     * 获取当前语言包
     */
    private getCurrentLanguagePackage(): LanguagePackage {
        return this.languagePackages.get(this.currentLanguage) ||
               this.languagePackages.get('en-US') ||
               this.fallbackLanguages.get('en-US')!;
    }

    /**
     * 设置语言
     */
    public async setLanguage(languageCode: string): Promise<boolean> {
        if (this.languagePackages.has(languageCode) || this.externalLanguagePackages.has(languageCode)) {
            this.currentLanguage = languageCode;
            await this.context.globalState.update('idleCodingGame.language', languageCode);
            console.log('[I18n] Language changed to:', languageCode);
            return true;
        }
        return false;
    }

    /**
     * 获取当前语言
     */
    public getCurrentLanguage(): string {
        return this.currentLanguage;
    }

    /**
     * 获取可用语言列表
     */
    public getAvailableLanguages(): LanguageInfo[] {
        const languages: LanguageInfo[] = [
            { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
            { code: 'en-US', name: 'English (US)', nativeName: 'English' }
        ];

        // 添加外部语言包
        for (const [code] of this.externalLanguagePackages) {
            if (!languages.find(l => l.code === code)) {
                languages.push({ code, name: code, nativeName: code });
            }
        }

        return languages;
    }

    /**
     * 注册外部语言包（供其他扩展使用）
     */
    public registerLanguagePackage(languageCode: string, languagePackage: LanguagePackage): void {
        this.externalLanguagePackages.set(languageCode, languagePackage);
        console.log('[I18n] External language package registered:', languageCode);
    }

    /**
     * 注销外部语言包
     */
    public unregisterLanguagePackage(languageCode: string): void {
        this.externalLanguagePackages.delete(languageCode);
        console.log('[I18n] External language package unregistered:', languageCode);
    }
}

/**
 * 全局翻译函数
 */
export function t(key: string, params?: TranslationParams): string {
    try {
        const i18nManager = I18nManager.getInstance();
        return i18nManager.translate(key, params);
    } catch (error) {
        console.error('[I18n] Translation error:', error);
        return key;
    }
}