/**
 * 语言包接口定义
 */
export interface LanguagePackage {
    game: {
        title: string;
        character: {
            defaultName: string;
            level: string;
            experience: string;
        };
    };
    ui: {
        resources: string;
        character: string;
        language: string;
        ignore: string;
    };
    resources: {
        linesOfCode: string;
        bugFragments: string;
        generation: string;
        perSecond: string;
    };
    stats: {
        computingPower: string;
        attack: string;
        defense: string;
        cost: string;
    };
    battle: {
        inBattle: string;
        health: string;
        autoProgress: string;
        fightNow: string;
    };
    upgrade: {
        title: string;
        success: string;
        insufficient: string;
        computingPower: {
            name: string;
            description: string;
            button: string;
        };
        attack: {
            name: string;
            description: string;
            button: string;
        };
        defense: {
            name: string;
            description: string;
            button: string;
        };
    };
    statistics: {
        title: string;
        totalLinesGenerated: string;
        totalBugsDefeated: string;
        totalPlayTime: string;
        keystrokes: string;
        minutes: string;
        seconds: string;
    };
    bugs: {
        nullPointerException: string;
        memoryLeak: string;
        infiniteLoop: string;
        syntaxError: string;
        runtimeError: string;
    };
    notifications: {
        bugDefeated: string;
        levelUp: string;
        dangerousCode: string;
    };
    commands: {
        openGame: string;
        resetWarning: string;
        resetConfirm: string;
        resetCancel: string;
        resetSuccess: string;
    };
    welcome: {
        typescript: string;
        javascript: string;
        python: string;
        java: string;
        cpp: string;
        rust: string;
    };
}

/**
 * 支持的语言列表
 */
export interface LanguageInfo {
    code: string;
    name: string;
    nativeName: string;
}

/**
 * 翻译插值参数类型
 */
export interface TranslationParams {
    [key: string]: string | number;
}