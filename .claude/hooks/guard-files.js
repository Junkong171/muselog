#!/usr/bin/env node
// 파일 편집(Edit / Write / MultiEdit / NotebookEdit) 전에 보호 파일을 막는 hook.
// Claude Code가 stdin으로 JSON({ tool_input: { file_path }, cwd, ... })을 넘겨준다.
// 차단: 이유를 stderr에 쓰고 exit 2 / 통과: exit 0

// package.json이 "type": "module"이라 require 대신 import를 쓴다.
import path from "node:path";

function block(reason) {
  process.stderr.write(`[차단됨] ${reason}\n이 파일은 사용자 승인 없이 수정할 수 없습니다. 사용자에게 먼저 물어보세요.\n`);
  process.exit(2);
}

function check(filePath, cwd) {
  // Windows 경로(\)를 /로 바꾸고, 대소문자 구분 없이 비교한다.
  const full = path.resolve(cwd, filePath).replace(/\\/g, "/").toLowerCase();
  const name = full.split("/").pop();

  if (/^\.env(\..+)?$/.test(name)) block(`${name}: 환경 변수(.env 계열) 파일입니다.`);
  if (name === "package-lock.json") block("package-lock.json: npm이 자동으로 관리하는 파일입니다.");
  if (full.includes("/.git/")) block(".git 폴더 안의 파일은 git 내부 데이터입니다.");
  if (full.endsWith("/.claude/settings.json")) block(".claude/settings.json: 권한과 hook 설정 파일입니다.");
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => (raw += chunk));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.stderr.write("guard-files: 입력 JSON을 읽지 못했습니다.\n");
    process.exit(1);
  }
  const toolInput = input.tool_input || {};
  const filePath = toolInput.file_path || toolInput.notebook_path || "";
  if (filePath) check(filePath, input.cwd || process.cwd());
  process.exit(0);
});
