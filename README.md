# 你画我猜 · 无服务器双人联机

两部手机（或浏览器）**点对点直连**的「你画我猜」。**不需要任何服务器**：互相扫一次二维码即建立 WebRTC 连接，轮流画与猜。一套 React 代码同时产出 **Web** 与 **Android APK**。

> 完整设计与开发进度见 [方案文档.md](方案文档.md)。

## 特性
- 🔌 **真·无服务器**：WebRTC `DataChannel` + 二维码手动信令（仅用免费公共 STUN 打洞，不用 TURN）
- 🎨 实时画布同步（画笔/橡皮/油漆桶/撤销/清空/调色/笔宽）
- 🎮 完整玩法：选词 → 限时作画 → 猜词 → 计分 → 回合结算 → 总分胜负 → 再来一局
- 💡 提示系统（词长/分类/逐字揭示）、「很接近」判定
- 💬 聊天 + 快捷表情飘屏、🔊 音效（Web Audio 合成）、📳 触觉、🌗 浅/深主题 + 皮肤
- 🔁 心跳断线检测 + 二维码重连 + 全量状态恢复
- 📱 React + Capacitor，Web/Android 双端

## 技术栈
React 18 · TypeScript · Vite · Tailwind CSS · Zustand · WebRTC · `@zxing/browser`(扫码) · `qrcode` · `pako`(信令压缩) · framer-motion · Capacitor 6

## 快速开始
> 本机 Node 由 fnm 管理；若 `node` 不在 PATH，先执行：
> `$env:PATH = "C:\Users\vetoe\AppData\Roaming\fnm\node-versions\v22.22.3\installation;$env:PATH"`

```bash
npm install
npm run dev        # http://localhost:5173（已开 host，可被同网手机访问）
npm test           # 逻辑测试全跑
npm run build      # 生产构建
```

**两端联机自测**：开两个浏览器标签（需 `localhost` 或 https 才能开摄像头）——
A 点「创建房间」展示邀请码，B 点「加入房间」扫 A 的码并生成应答码，A 再扫 B 的应答码 → 连上开玩。

## 打包 Android
```bash
npm run cap:sync     # 构建 + 同步到 android/
npm run cap:open     # Android Studio 打开
npm run android:apk  # 直接出调试 APK → android/app/build/outputs/apk/debug/
npm run android:release:install  # 编译 release APK 并通过 adb 安装到已连接手机
```
需 Android SDK + JDK 17+，并确保 `adb devices` 能看到目标手机。`AndroidManifest.xml` 已声明相机/震动/网络权限。

## 目录结构
```
src/
  net/      WebRTC(peer) · 信令编解码(signaling) · 协议(protocol)
  game/     词库 · 计分 · 房主权威引擎(engine)
  store/    connStore(连接) · gameStore(对局+绘画) · uiStore(设置)
  components/ 画布 · 工具栏 · 二维码 · 游戏 HUD/聊天/表情 · Clay UI
  pages/    Home · Host · Join · Game · Settings · Help
  lib/      canvasDraw · sound · haptics · native(Capacitor) · theme
scripts/    test-*.ts（信令/WebRTC/绘画/引擎/重连测试）
android/    Capacitor 原生工程（M5 生成）
```

## 玩法
两人各执一机，每回合一人画一人猜，回合结束自动交换角色。越快猜对得分越高，全部回合后高分者胜。详见游戏内「玩法」。
