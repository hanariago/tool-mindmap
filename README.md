# tool-mindmap

기획·아이디어 정리를 위한 **마인드맵 / 플로우차트 에디터**.
브라우저에서 100% 동작하며 서버로 아무것도 전송하지 않습니다. 모든 작업은 이 브라우저(localStorage)에만 저장됩니다.

> 순수 바닐라 JS + SVG · 빌드 과정 없음 · GitHub Pages 정적 호스팅

## ✨ 기능

**노드 / 캔버스**
- 노드 생성·삭제·드래그 이동
- 노드 간 연결선 (드래그로 연결, 화살표 방향 표시)
- 더블클릭 인라인 텍스트 편집 (여러 줄 지원)
- 노드 모양 4종(둥근 사각형·사각형·원형·다이아몬드) · 색상 8종
- 확대/축소(휠·핀치)·패닝·전체 보기 맞춤
- 부모-자식 계층 구조 + 펼치기/접기
- 자동 트리 정렬(Tidy)

**편의**
- 자동 저장 (새로고침해도 유지)
- 여러 맵 관리 (이름 지정·목록 불러오기·삭제)
- 실행취소 / 다시실행
- 마인드맵 표준 단축키 (Tab=자식, Enter=형제 등)
- 다중 선택 (Shift 드래그 마퀴 / Shift·Ctrl 클릭)
- JSON 백업 / 가져오기

**내보내기**
- PNG 이미지
- Markdown (들여쓰기 계층 리스트)
- Mermaid 문법 (`graph LR`, 다른 도구 호환)
- SVG 벡터

**모바일**
- 터치로 노드 이동, 핀치 줌, 패닝
- 연결 전용 모드(FAB) — 시작 노드 탭 → 대상 노드 탭

## ⌨️ 단축키

| 키 | 동작 |
|---|---|
| `Tab` | 자식 노드 추가 |
| `Enter` | 형제 노드 추가 |
| `F2` / 더블클릭 | 텍스트 편집 |
| `Delete` / `Backspace` | 삭제 |
| `Ctrl+Z` / `Ctrl+Shift+Z` | 실행취소 / 다시실행 |
| `Ctrl+D` | 복제 |
| 방향키 | 인접 노드 선택 |
| `Space` | 펼치기/접기 |
| `Ctrl+=` / `Ctrl+-` | 확대 / 축소 |
| `Esc` | 편집·선택 취소 |

## 🚀 로컬 실행

별도 빌드가 필요 없습니다. 정적 파일을 그대로 서빙하면 됩니다.

```bash
# 아무 정적 서버나 사용
npx serve .
# 또는
python -m http.server 8000
```

## 📦 GitHub Pages 배포

1. 이 저장소를 Public 으로 GitHub 에 푸시
2. **Settings → Pages → Build and deployment → Source: `Deploy from a branch`**
3. Branch `main` / 폴더 `/ (root)` 선택 후 저장
4. 잠시 후 `https://<사용자명>.github.io/tool-mindmap/` 에서 접속

## 🗂 구조

```
index.html    # 마크업 + 툴바/패널/모달
styles.css    # 라이트 테마 (#F7F5F0 / 포인트 #3D6B5E)
app.js        # 전체 로직 (상태·렌더링·인터랙션·내보내기)
```

데이터는 `localStorage` 의 `tmm.*` 키에 저장됩니다.

## 사용한 오픈소스 / 에셋

- **Noto Sans KR** — 웹폰트(Google Fonts 링크) · SIL Open Font License 1.1 · [링크](https://fonts.google.com/noto/specimen/Noto+Sans+KR)
- 그 외 외부 라이브러리 없음 — 순수 HTML/CSS/JS (바닐라)

## 노출 표준

기본 SEO·OG·Twitter Card·JSON-LD(WebApplication + FAQPage)·한/영 i18n·`robots.txt`·`sitemap.xml`·`llms.txt`·favicon·교차링크(tools-hub) 적용.

---

Made by [Lena](https://x.com/thezenvoid) · License: MIT (외부 리소스: Noto Sans KR — OFL 1.1)
🔧 [다른 도구 모음 →](https://hanariago.github.io/tools-hub/)
