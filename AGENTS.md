当用户需要分析图片时：
1. 用户复制图片到剪贴板，发文字消息（**不要**把图片粘贴到对话框）
2. 你用 PowerShell 保存剪贴板图片到 `~/.config/opencode/.clipboard_cache/`，文件名为 `clipboard_yyyyMMdd_HHmmss.png`
3. 保存后，清理该目录：只保留最新的 10 张图片，删除更早的
4. **默认分析最新保存的图片**（按修改时间排序），除非用户额外说明要分析其他指定图片
5. 然后用 task tool 调用 vision 子代理分析图片

如果图片已在项目目录（如 assets/），直接 spawn vision 子代理处理。

打包项目时：
1. 使用全局 skill `web-mock-build-deploy`（位于 `~/.config/opencode/skills/web-mock-build-deploy/`）
2. 打包前将 HTML 文件重命名为 `index.html`，确保部署后子路径可直接访问
3. 项目相关静态资源（如 logo.jpg）需一并打包
