#!/usr/bin/env node
// Bash / PowerShell 명령 실행 전에 위험한 명령을 막는 hook.
// Claude Code가 stdin으로 JSON({ tool_name, tool_input: { command }, cwd, ... })을 넘겨준다.
// 차단: 이유를 stderr에 쓰고 exit 2 / 통과: exit 0

// package.json이 "type": "module"이라 require 대신 import를 쓴다.
import { execSync } from "node:child_process";

function block(reason) {
  process.stderr.write(`[차단됨] ${reason}\n사용자 승인이 필요한 작업입니다. 사용자에게 먼저 물어보세요.\n`);
  process.exit(2);
}

// 한 줄 명령을 ; && || | 줄바꿈 기준으로 나눈다.
function splitSegments(command) {
  return command.split(/[;&|\n]+/).map(s => s.trim()).filter(Boolean);
}

function currentBranch(cwd) {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { cwd, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

function check(command, cwd) {
  for (const seg of splitSegments(command)) {
    const tokens = seg.split(/\s+/);

    // 1) rm -rf (bash): rm 뒤에 재귀(r) + 강제(f) 옵션이 모두 있으면 차단
    const rmMatch = seg.match(/(?:^|\s|\()(?:sudo\s+)?rm\s+(.*)$/i);
    if (rmMatch) {
      const args = rmMatch[1].split(/\s+/);
      const hasR = args.some(a => /^-[a-zA-Z]*[rR][a-zA-Z]*$/.test(a) || a === "--recursive");
      const hasF = args.some(a => /^-[a-zA-Z]*f[a-zA-Z]*$/i.test(a) || a === "--force");
      if (hasR && hasF) block("rm -rf (재귀 강제 삭제)는 파일을 되돌릴 수 없게 지웁니다.");
    }

    // 2) PowerShell: Remove-Item(및 별칭) -Recurse -Force
    if (/(?:^|\s|\()(remove-item|ri|rm|rmdir|rd|del|erase)\s/i.test(seg)) {
      const hasRecurse = /\s-r(e(c(u(r(s(e)?)?)?)?)?)?\b/i.test(seg);
      const hasForce = /\s-fo(r(c(e)?)?)?\b/i.test(seg);
      if (hasRecurse && hasForce) block("Remove-Item -Recurse -Force (재귀 강제 삭제)는 파일을 되돌릴 수 없게 지웁니다.");
    }

    // 3) cmd 방식: rmdir /s /q, del /s /q
    if (/(?:^|\s)(rmdir|rd|del|erase)\s/i.test(seg) && /\s\/s\b/i.test(seg) && /\s\/q\b/i.test(seg)) {
      block("rmdir/del /s /q (하위 폴더까지 묻지 않고 삭제)는 되돌릴 수 없습니다.");
    }

    // 4) git push 관련
    if (/\bgit\b.*\bpush\b/i.test(seg)) {
      if (/\s(--force|--force-with-lease|--force-if-includes)\b/i.test(seg) || /\s-[a-zA-Z]*f\b/.test(seg) || /\s\+\S/.test(seg)) {
        block("git push --force(강제 푸시)는 원격 저장소의 기록을 덮어씁니다.");
      }
      if (/\s(--all|--mirror)\b/i.test(seg)) {
        block("git push --all / --mirror는 main 브랜치까지 한꺼번에 푸시합니다.");
      }
      if (/(\s|:)(main|master)(\s|$)/i.test(seg)) {
        block("main 브랜치로 직접 푸시할 수 없습니다. 새 브랜치에서 작업하고 푸시하세요.");
      }
      // 'git push' 또는 'git push origin'처럼 브랜치를 생략하면 현재 브랜치가 푸시된다.
      const afterPush = tokens.slice(tokens.findIndex(t => /^push$/i.test(t)) + 1).filter(t => !t.startsWith("-"));
      if (afterPush.length <= 1) {
        const branch = currentBranch(cwd);
        if (branch === "main" || branch === "master") {
          block(`지금 브랜치가 ${branch}입니다. main 브랜치로 직접 푸시할 수 없습니다.`);
        }
      }
    }

    // 5) git reset --hard
    if (/\bgit\b.*\breset\b.*--hard\b/i.test(seg)) {
      block("git reset --hard는 저장하지 않은 변경 사항을 모두 지웁니다.");
    }

    // 6) npm publish
    if (/\b(npm|pnpm|yarn)\s+publish\b/i.test(seg)) {
      block("npm publish는 패키지를 외부에 공개 배포합니다.");
    }

    // 7) 배포 명령
    if (
      /\bvercel\b.*--prod\b/i.test(seg) ||
      /\bnetlify\b.*\bdeploy\b.*--prod\b/i.test(seg) ||
      /\bfirebase\b.*\bdeploy\b/i.test(seg) ||
      /\bgh-pages\b/i.test(seg) ||
      /\b(npm|pnpm|yarn)\s+(run\s+)?deploy\b/i.test(seg)
    ) {
      block("배포 명령은 실제 서비스에 바로 반영됩니다.");
    }
  }
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => (raw += chunk));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.stderr.write("guard-bash: 입력 JSON을 읽지 못했습니다.\n");
    process.exit(1);
  }
  const command = (input.tool_input && input.tool_input.command) || "";
  check(command, input.cwd || process.cwd());
  process.exit(0);
});
