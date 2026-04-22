# ikeda.simulator

Ryoji Ikeda의 작품 세계를 학습하기 위한 인터랙티브 시뮬레이터.
일본의 전자음악 작곡가·비주얼 아티스트 Ryoji Ikeda(1966–)의 대표작 5종을
브라우저에서 직접 조작하며 원리를 익힐 수 있도록 만들어졌습니다.

## 5 modes

| # | mode | reference |
|---|------|-----------|
| 01 | `test_pattern` | test pattern series (2008–) |
| 02 | `data.matrix` | datamatics, data.tron (2006–2008) |
| 03 | `sine_wave` | +/- (1996), 0°C (1998), dataplex (2005) |
| 04 | `spectra` | spectra II–IX, supersymmetry (CERN, 2014) |
| 05 | `+/- glitch` | +/-, formula, micro-distortion works |

## 사용법

빌드 도구 없이 정적 파일만 있습니다. 그냥 `index.html`을 브라우저로 열거나,
로컬 서버를 띄워 실행하세요.

```bash
python -m http.server 8080
# → http://localhost:8080
```

## 키보드

- `1` ~ `5` : 모드 전환
- `space` : 일시정지
- `f` : 풀스크린
- `h` : HUD 토글
- `s` : 사운드 on/off

## 파라미터

| name | 설명 |
|------|------|
| density | 화면을 채우는 요소 개수 |
| speed | 시간 흐름 배속 |
| contrast | 흑백 대비 강도 |
| glitch | 무작위 노이즈 강도 |
| frequency | 사운드 음높이 (Hz) |
| volume | 음량 |

## 기술 스택

- HTML / CSS / Vanilla JS
- Canvas 2D
- Web Audio API

## 구조

```
.
├── index.html   # UI markup, 학습용 설명 패널
├── styles.css   # 모노크롬 모노스페이스 UI
└── app.js       # 5개 모드 렌더러 + 오디오
```

## 주의

`sine_wave` 모드의 사운드는 순수한 사인파입니다.
이케다 작품의 특성상 극저역·극고역을 자주 사용하므로 **반드시 낮은 볼륨에서 시작하세요.**
