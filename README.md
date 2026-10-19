# GeoLab

고등학생용 세계지리·한국지리 학습 웹사이트입니다.

- 과목별 단원 선택, OX 학습, 오답·문항 저장
- OX·기후·통계·기출·Notes·일조 자료 통합 검색
- 지도·기후·통계·기출의 원본 고급 기능을 자체 웹사이트 경로로 제공
- 스마트폰 설치형 PWA, 안드로이드 앱 빌드 지원 예정

GitHub Actions에서 원본 공개 배포 파일 약 3천 개를 사이트 내부로 가져옵니다.
원본 콘텐츠는 누락 없이 보존하며, 자료 사용 조건과 출처는 원본 라이선스를 따릅니다.

원본: twotimess / Promenade Geography (비영리, 출처 표기).
원본 코드 PolyForm Noncommercial 1.0.0, 데이터 CC BY-NC-SA 4.0.
제3자 자료 재배포는 별도 허락 범위를 확인해야 합니다.

배포: 저장소 Settings → Pages → Build and deployment → GitHub Actions.
예상 URL: https://jisanhigh.github.io/GeoLab/

<!-- GitHub Pages redeploy requested after enabling GitHub Actions source. -->


## OX 해설 관리

- 원본 OX 1,176문항의 정답을 변경하지 않습니다.
- X 정답 411문항: 원본 정정 설명을 그대로 보존합니다.
- O 정답 765문항: \`app/ox-explain.js\`에서 세계지리·한국지리 소주제별로 개념 설명을 제공합니다. 자주 출제되는 개념 31문항에는 보다 구체적인 문항별 이유가 적용됩니다.
- 기존 원문에 없는 해설은 *GeoLab 보충 해설*로 구분합니다. **전체 1,176문항을 일일이 원출처 대조해 사실 검증했다는 의미가 아닙니다.**
- 개별 문항에 구체적인 해설을 보충하려면 \`ox-explain.js\`의 \`EXTRA\` 규칙에 문항 문구와 설명을 추가합니다.
- 기후, 국가별 생산량·순위, 인구 비율 등 변동 가능한 문항에는 자료 연도 확인 안내가 표시됩니다.
- \`tests/ox-explain.test.cjs\`에서 전체 문항 누락, 중복 키, 원본 정정 설명의 변조 여부를 자동 검사합니다.
