#!/usr/bin/env node
// tester 서브에이전트 전용 Bash 허용 목록 hook.
// .claude/agents/tester.md 의 frontmatter에만 등록되어 tester가 도는 동안에만 실행된다.
// 허용: npm test / npm run build / npm run lint / git status / git diff / git log
// 그 밖의 명령, 리다이렉션(>, >>), 파이프, 명령 이어 붙이기는 모두 차단한다.
// 차단: 이유를 stderr에 쓰고 exit 2 / 통과: exit 0

function block(reason) {
  process.stderr.write(`[차단됨: tester] ${reason}\ntester는 파일을 수정할 수 없습니다. 고칠 부분은 보고만 하세요.\n`);
  process.exit(2);
}

function check(command) {
  const cmd = command.trim();

  // 1) 쓰기로 이어질 수 있는 셸 문법: 리다이렉션, 파이프, 이어 붙이기, 명령 치환
  if (/[<>]/.test(cmd)) block("리다이렉션(>, >>, <)은 허용되지 않습니다.");
  if (/\btee\b/i.test(cmd)) block("tee는 출력을 파일에 쓰므로 허용되지 않습니다.");
  if (/[|;&`\n\r]|\$\(/.test(cmd)) block("파이프(|), 명령 이어 붙이기(; && ||), 명령 치환은 허용되지 않습니다.");

  // 2) npm: 정확히 일치할 때만 허용 (옵션을 붙이면 빌드 출력 위치 변경 등이 가능하므로 차단)
  if (/^npm(\s|$)/i.test(cmd)) {
    if (/^npm (test|run build|run lint)$/.test(cmd)) return;
    block(`허용되지 않은 npm 명령입니다: ${cmd}\n허용: npm test, npm run build, npm run lint (옵션 없이)`);
  }

  // 3) git: status / diff / log 만, git 전역 옵션(-C, -c 등) 없이
  const git = cmd.match(/^git\s+(\S+)/i);
  if (git && /^git(\s|$)/.test(cmd)) {
    if (!["status", "diff", "log"].includes(git[1])) {
      block(`허용되지 않은 git 명령입니다: ${cmd}\n허용: git status, git diff, git log`);
    }
    // --output=<파일> 은 결과를 파일로 쓰고, --ext-diff 는 외부 프로그램을 실행한다.
    if (/\s--output\b/i.test(cmd)) block("git --output 옵션은 파일을 쓰므로 허용되지 않습니다.");
    if (/\s--ext-diff\b/i.test(cmd)) block("git --ext-diff 옵션은 외부 프로그램을 실행하므로 허용되지 않습니다.");
    return;
  }

  block(`허용 목록에 없는 명령입니다: ${cmd}\n허용: npm test, npm run build, npm run lint, git status, git diff, git log`);
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => (raw += chunk));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    // 입력을 읽지 못하면 안전하게 차단한다.
    block("guard-tester: 입력 JSON을 읽지 못했습니다.");
  }
  // 이중 안전장치: 다른 에이전트(Main 포함)의 호출이면 관여하지 않는다.
  if (input.agent_type && input.agent_type !== "tester") process.exit(0);
  if (input.tool_name && input.tool_name !== "Bash") block(`tester는 ${input.tool_name} 도구를 쓸 수 없습니다.`);
  const command = (input.tool_input && input.tool_input.command) || "";
  check(command);
  process.exit(0);
});
