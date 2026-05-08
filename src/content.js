window.GameContent = {
  ranks: [
    { name: "Unrated / 未评级", min: 0, color: "#9aadc2", hint: "还没交第一发" },
    { name: "Bronze / 入门题", min: 3000, color: "#c58b5f", hint: "会写模拟题" },
    { name: "Silver / 基础算法", min: 9000, color: "#c8d4e3", hint: "二分和 BFS 都稳了" },
    { name: "Gold / 区域赛苗子", min: 22000, color: "#ffd166", hint: "开始盯榜了" },
    { name: "Platinum / 隐藏样例猎手", min: 52000, color: "#79ff9d", hint: "能和系统对拍" },
    { name: "Diamond / 题解作者", min: 110000, color: "#7ba7ff", hint: "一眼复杂度" },
    { name: "Red / 传奇红名", min: 220000, color: "#ff6378", hint: "评测机为你亮灯" }
  ],

  upgradeMilestones: [9000, 22000, 42000, 70000, 108000, 158000, 225000],

  upgrades: [
    {
      id: "gun",
      group: "火力",
      title: "主炮编译优化",
      text: "主炮等级 +1：提高射速，高等级会追加侧翼弹道。",
      apply(player) {
        player.upgrades.gun += 1;
      }
    },
    {
      id: "pipeline",
      group: "火力",
      title: "流水线发射器",
      text: "主炮等级 +2，但判题能量获取略慢，适合火力压制。",
      apply(player) {
        player.upgrades.gun += 2;
        player.perks.energyTax += 0.08;
      }
    },
    {
      id: "engine",
      group: "机动",
      title: "良乡夜航引擎",
      text: "引擎等级 +1：提高常规移动速度，走位更细。",
      apply(player) {
        player.upgrades.engine += 1;
      }
    },
    {
      id: "cacheEngine",
      group: "机动",
      title: "缓存预取引擎",
      text: "引擎等级 +2，并扩大拾取道具的吸附距离。",
      apply(player) {
        player.upgrades.engine += 2;
        player.perks.magnet += 1;
      }
    },
    {
      id: "dash",
      group: "机动",
      title: "零拷贝冲刺",
      text: "冲刺等级 +1：缩短冷却，Perfect Dash 给更多能量。",
      apply(player) {
        player.upgrades.dash += 1;
      }
    },
    {
      id: "iframing",
      group: "机动",
      title: "异常安全帧",
      text: "冲刺等级 +1，并延长冲刺无敌窗口。",
      apply(player) {
        player.upgrades.dash += 1;
        player.perks.iframe += 1;
      }
    },
    {
      id: "protocol",
      group: "协议",
      title: "AC 自动机协议",
      text: "协议等级 +1：延长判题模式和护盾收益。",
      apply(player) {
        player.upgrades.protocol += 1;
      }
    },
    {
      id: "verdictBloom",
      group: "协议",
      title: "Verdict Bloom",
      text: "协议等级 +2，判题模式会额外削弱 Boss。",
      apply(player) {
        player.upgrades.protocol += 2;
        player.perks.bossDamage += 1;
      }
    },
    {
      id: "rollback",
      group: "生存",
      title: "回滚检查点",
      text: "最大生命 +1，并立即回复 1 点生命。",
      apply(player) {
        player.maxLife += 1;
        player.life = Math.min(player.maxLife, player.life + 1);
      }
    },
    {
      id: "grazeCompiler",
      group: "技巧",
      title: "擦弹编译器",
      text: "擦弹和 Perfect Dash 的能量收益提高。",
      apply(player) {
        player.perks.grazeGain += 1;
      }
    },
    {
      id: "shieldRecycle",
      group: "生存",
      title: "护盾回收站",
      text: "护盾挡弹时回收少量判题能量。",
      apply(player) {
        player.perks.shieldRecycle += 1;
      }
    },
    {
      id: "bossBreaker",
      group: "Boss",
      title: "隐藏样例破解器",
      text: "对 Boss 造成更高伤害，击破 Boss 时额外获得倍率。",
      apply(player) {
        player.perks.bossDamage += 2;
      }
    }
  ],

  bosses: [
    {
      name: "隐藏样例：边界风暴",
      color: "#ffd166",
      hp: 520,
      quote: "样例过了，不代表真的过了。",
      story: {
        speaker: "徐特立图书馆 · 闭馆广播",
        title: "边界风暴",
        text: "灯光忽然闪了一下。你刚通过的样例在排行榜旁边裂开一道缝，里面滚出从未出现过的边界条件。"
      }
    },
    {
      name: "系统测试：内存漩涡",
      color: "#7ba7ff",
      hp: 680,
      quote: "空间复杂度正在逼近上限。",
      story: {
        speaker: "OJ Core",
        title: "内存漩涡",
        text: "评测机没有宣判，只把内存曲线投到夜空上。曲线抬头的瞬间，整条航线开始向中心塌缩。"
      }
    },
    {
      name: "终测机：红名守门人",
      color: "#ff6378",
      hp: 860,
      quote: "请证明你的做法。",
      story: {
        speaker: "红名守门人",
        title: "终测机",
        text: "一个匿名账号接管了频道。它没有发题解，只留下四个字：证明做法。下一秒，终测数据开始装填。"
      }
    }
  ]
};
