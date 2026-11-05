// 마이크를 켜지 못했을 때의 안내 문구 (튜너와 음성 메모가 함께 쓴다)
// installed = 홈 화면에 설치한 앱으로 열었는지 (주소창이 없어 자물쇠 안내를 따라 할 수 없다)
export function micErrorMessage(error, installed = false) {
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return installed
      ? "마이크 사용이 허락되지 않았어요. 이 앱을 설치한 브라우저(삼성 인터넷·Chrome 등)의 설정 → 사이트 권한 → 마이크에서 허용하고, 앱을 다시 열어 주세요. 휴대폰 설정에서 그 브라우저의 마이크 권한도 확인해 주세요."
      : "마이크 사용이 허락되지 않았어요. 주소창 왼쪽 자물쇠에서 마이크를 허용해 주세요.";
  }
  if (error?.name === "NotFoundError" || error?.name === "OverconstrainedError") {
    return "마이크를 찾지 못했어요. 마이크가 연결되어 있는지 확인해 주세요.";
  }
  return "마이크를 켜지 못했어요. 다른 앱이 마이크를 쓰고 있지 않은지 확인해 주세요.";
}

// 홈 화면에 설치한 앱으로 열었는지 (주소창 없이 꽉 찬 화면, 아이폰은 navigator.standalone)
export function isInstalledApp() {
  if (typeof window === "undefined") return false;
  return Boolean(window.matchMedia?.("(display-mode: standalone)").matches || window.navigator?.standalone);
}
