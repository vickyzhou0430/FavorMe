# Phase 2: Android 对话与选题 UI - Pattern Map

**Mapped:** 2026-05-10
**Files analyzed:** 16 new/modified file groups
**Analogs found:** 14 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `clients/flutter/pubspec.yaml` | config | dependency/config | `docs/tech-stack.md` + `clients/flutter/README.md` | doc-match |
| `clients/flutter/analysis_options.yaml` | config | lint/config | `.planning/codebase/CONVENTIONS.md` | doc-match |
| `clients/flutter/lib/main.dart` | app entry | request-response boot | `backend/src/main.ts` + `demo/web/src/app/page.tsx` | partial |
| `clients/flutter/lib/src/app/favorme_app.dart` | provider/app shell | state-driven UI | `demo/web/src/app/page.tsx` | partial |
| `clients/flutter/lib/src/theme/app_theme.dart` | theme/config | transform | `02-UI-SPEC.md` + `demo/web/src/app/globals.css` | doc-match |
| `clients/flutter/lib/src/features/insight/insight_flow_screen.dart` | screen/component | state machine + request-response | `demo/web/src/app/fortune/page.tsx` | role-match |
| `clients/flutter/lib/src/features/insight/insight_view_model.dart` | view model/store | request-response state machine | `demo/web/src/app/fortune/page.tsx` + `backend/src/insight/insight.service.ts` | role-match |
| `clients/flutter/lib/src/features/insight/insight_models.dart` | model | JSON transform | `backend/src/insight/dto/question.dto.ts` + `submit-insight.dto.ts` | exact API contract |
| `clients/flutter/lib/src/features/insight/insight_api_client.dart` | service/client | request-response | `backend/README.md` + `demo/web/src/lib/ai-service.ts` | role-match |
| `clients/flutter/lib/src/features/insight/device_id_store.dart` | utility/store | local persistence | `demo/web/src/lib/user-store.ts` + `ApiTokenGuard` | role-match |
| `clients/flutter/lib/src/features/insight/widgets/bottom_question_input.dart` | component | user input | `demo/web/src/app/globals.css` + `Button.tsx` | role-match |
| `clients/flutter/lib/src/features/insight/widgets/question_card.dart` | component | state-driven selection | `demo/web/src/components/ui/Card.tsx` + `fortune/page.tsx` | role-match |
| `clients/flutter/lib/src/features/insight/widgets/loading_error_card.dart` | component | loading/error display | `Spinner.tsx` + `Toast.tsx` + `HttpExceptionFilter` | role-match |
| `clients/flutter/lib/src/features/insight/widgets/result_card.dart` | component | response display | `Card.tsx` + `fortune/page.tsx` | role-match |
| `clients/flutter/android/app/src/main/AndroidManifest.xml` and network config | platform config | network/config | `clients/android/README.md` + `docs/deployment.md` | doc-match |
| `docs/tech-stack.md`, `docs/architecture.md`, `clients/android/README.md`, `clients/flutter/README.md` | documentation | decision sync | `02-CONTEXT.md` + existing docs | exact docs update |

## Pattern Assignments

### `clients/flutter/pubspec.yaml` (config, dependency/config)

**Analog:** `docs/tech-stack.md`, `clients/flutter/README.md`

**Stack decision to replace** (`docs/tech-stack.md` lines 41-58):
```markdown
## 4. 客户端

### 4.1 当前试水 MVP（已拍板）

| 项 | 定稿 |
|----|------|
| 形态 | **Android 原生 App 优先**（核心先实现提问、三问生成与作答链路） |
| 目的 | **最短时间**验证“心理洞察三问”是否有效，并拿到真实用户反馈 |
| 实现位置 | 先落地 `clients/android`；iOS 暂不并行，避免分散资源 |
```

**Flutter README conflict** (`clients/flutter/README.md` lines 1-11):
```markdown
# FavorMe Flutter 客户端（正式期）

> **定稿**（见 [`../docs/tech-stack.md`](../docs/tech-stack.md)、[`../docs/decisions/003-client-mvp-webview-flutter.md`](../docs/decisions/003-client-mvp-webview-flutter.md)）  
> **MVP/首版** 不依赖本目录：先用 **`WebView` 薄壳 + `demo/web` H5** 跑通全链路与上架。  
> **MVP 之后** 在此目录初始化 **单工程** **Flutter** 应用，替代或迁移薄壳 H5 体验。
```

**Apply:** initialize the Flutter project in `clients/flutter` as the Phase 2 main implementation, keep dependencies light (`flutter`, `http` or `dio`, test tooling only). Do not introduce Riverpod/Bloc unless Flutter initialization makes the built-in `ChangeNotifier` path unsuitable.

---

### `clients/flutter/analysis_options.yaml` (config, lint/config)

**Analog:** `.planning/codebase/CONVENTIONS.md`

**Style conventions** (lines 24-35):
```markdown
## Code Style

**Formatting:**
- No dedicated Prettier config is detected (`.prettierrc*` not present at repo root or package level).
- Use package-local established style:
  - `demo/web` consistently uses double quotes and no semicolons
  - `backend` consistently uses single quotes and semicolons
```

**Apply:** use Flutter's standard lints and package-local formatting. Avoid repo-wide style churn.

---

### `clients/flutter/lib/main.dart` (app entry, request-response boot)

**Analog:** `backend/src/main.ts`, `demo/web/src/app/page.tsx`

**Bootstrap pattern** (`backend/src/main.ts` lines 6-18):
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}
```

**Minimal mobile shell pattern** (`demo/web/src/app/page.tsx` lines 16-23):
```tsx
return (
  <main className="relative mx-auto flex min-h-dvh w-full max-w-[520px] flex-col items-center justify-center px-3 py-6 sm:px-4 sm:py-8">
    <div className="starfield absolute inset-0 -z-10" />
    <div className="glass-card w-full max-w-md p-6 text-center">
      <div className="text-base font-semibold text-white">正在连接心安频道…</div>
      <div className="mt-2 text-sm text-white/70">即将进入 FavorMe</div>
    </div>
  </main>
);
```

**Apply:** keep `main.dart` thin: call `runApp`, set up the top-level Flutter app, theme, and root `InsightFlowScreen`. Do not add routing complexity for the one-screen Phase 2 flow.

---

### `clients/flutter/lib/src/app/favorme_app.dart` (provider/app shell, state-driven UI)

**Analog:** `demo/web/src/app/page.tsx`

**Navigation-gate pattern** (`demo/web/src/app/page.tsx` lines 7-14):
```tsx
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const u = loadUser();
    if (!u) router.replace("/login");
    else if (!u.onboardingDone) router.replace("/onboarding");
    else router.replace("/fortune");
  }, [router]);
```

**Apply:** Phase 2 should not implement auth/onboarding routing, but the app shell should own top-level app concerns. Put `MaterialApp`, theme, and the single insight screen here so later routes can be added without moving feature code.

---

### `clients/flutter/lib/src/theme/app_theme.dart` (theme/config, transform)

**Analog:** `02-UI-SPEC.md`, `demo/web/src/app/globals.css`

**Design tokens** (`02-UI-SPEC.md` lines 67-87):
```markdown
| Dominant (60%) | `#F6F5EF` | Screen background, safe-area fill, warm empty space |
| Secondary (30%) | `#FFFFFF` | Question cards, result card, input capsule, modal-like surfaces |
| Accent (10%) | `#6F9F72` | Send button, selected option pill/check, progress mark, retry action, “再问一次” affordance |
| Text primary | `#1F251F` | Main question/result copy |
| Text secondary | `#69736A` | Helper copy, progress, metadata |
| Border soft | `#E5E1D8` | Card/input outlines where shadow alone is insufficient |
| Shadow soft | `rgba(52, 67, 50, 0.10)` | Cards and bottom input elevation |
```

**Existing CSS token pattern** (`demo/web/src/app/globals.css` lines 5-19):
```css
:root {
  --bg0: 6 20 80;
  --bg1: 36 43 109;
  --text: 240 242 255;
  --muted: 172 182 214;
  --border: 255 255 255;
  --glass: 255 255 255;
  --accent: 150 132 255; /* lavender */
  --accent2: 120 203 255; /* sky */
}
```

**Apply:** define a small Dart token class or theme extension for colors, spacing, radii, shadows, and text roles. The Flutter palette should follow UI-SPEC, not the older purple web demo palette.

---

### `clients/flutter/lib/src/features/insight/insight_flow_screen.dart` (screen/component, state machine + request-response)

**Analog:** `demo/web/src/app/fortune/page.tsx`

**Stateful screen pattern** (lines 146-160):
```tsx
export default function FortunePage() {
  const { user } = useUser();
  const fortuneCacheKey = useMemo(() => storageKeyFortuneCache(user?.userId), [user?.userId]);
  const [loading, setLoading] = useState(false);
  const today = useMemo(() => isoDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [fortune, setFortune] = useState<FortuneData | null>(null);
  const [fortuneDate, setFortuneDate] = useState<string | null>(null);
  const loadSeqRef = useRef(0);
  const [hint, setHint] = useState("");
```

**Conditional loading/content rendering** (lines 396-435):
```tsx
{showFortuneLoading ? (
  <div className="relative mt-6 flex min-h-[120px] shrink-0 flex-col items-center justify-center gap-2 px-2 text-center text-sm text-white/90">
    <Spinner className="!border-white/40 !border-t-white/90" />
    <span>正在生成今日运势…</span>
    <span className="text-xs text-white/65">{selectedDate}</span>
  </div>
) : (
  <div className="relative mt-5 min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
    <div className="grid gap-3 pb-1">
```

**Apply:** Flutter screen observes a `ChangeNotifier`/ViewModel and renders one finite state at a time: `idle`, `generatingQuestions`, `answeringQuestion`, `submittingAnswers`, `showingResult`, `error`. Keep a single-page flow, not a chat-history list.

---

### `clients/flutter/lib/src/features/insight/insight_view_model.dart` (view model/store, request-response state machine)

**Analog:** `demo/web/src/app/fortune/page.tsx`, `backend/src/insight/insight.service.ts`

**Async boundary with stale-response guard** (`demo/web/src/app/fortune/page.tsx` lines 192-232):
```tsx
async function loadFortune(date: string) {
  const seq = ++loadSeqRef.current;
  setLoading(true);
  try {
    const cache = trimCache(getCacheForUser(fortuneCacheKey), today);
    const cached = cache[date];
    if (cached && isFortuneValid(cached)) {
      if (seq !== loadSeqRef.current) return;
      setFortune(cached);
      setFortuneDate(date);
      return;
    }
    // ...
  } finally {
    if (seq === loadSeqRef.current) setLoading(false);
  }
}
```

**Backend flow to mirror** (`backend/src/insight/insight.service.ts` lines 77-114):
```typescript
async generateQuestions(
  dto: GenerateQuestionsDto,
  context: InsightRequestContext,
): Promise<{ questions: InsightQuestion[] }> {
  const startedAt = Date.now();
  let userId = 'unknown';

  try {
    const rawQuestion = normalizeAndValidateRawQuestion(dto, context.requestId);
    userId = await this.ensureUserId(context.deviceId);
    const completion = await this.llm.completeChat({
      system: QUESTIONS_SYSTEM_PROMPT,
      user: buildQuestionsUserPrompt(rawQuestion),
      temperature: 0.3,
    });
```

**Apply:** ViewModel owns preserved `rawQuestion`, full `questions` snapshot, selected answers, current question index, retry target, and duplicate-submit prevention. Retry must call only the failed step.

---

### `clients/flutter/lib/src/features/insight/insight_models.dart` (model, JSON transform)

**Analog:** `backend/src/insight/dto/question.dto.ts`, `backend/src/insight/dto/submit-insight.dto.ts`

**Question snapshot contract** (`backend/src/insight/dto/question.dto.ts` lines 11-43):
```typescript
export const INSIGHT_DIMENSIONS = [
  'inner_preference',
  'fear_boundary',
  'active_vs_avoidance',
] as const;

export class QuestionSnapshotDto {
  @IsString()
  id!: string;

  @IsIn(INSIGHT_DIMENSIONS)
  dimension!: InsightDimension;

  @IsString()
  title!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options!: QuestionOptionDto[];
}
```

**Submit contract** (`backend/src/insight/dto/submit-insight.dto.ts` lines 12-41):
```typescript
export class InsightAnswerDto {
  @IsString()
  questionId!: string;

  @IsString()
  optionId!: string;
}

export class SubmitInsightDto {
  @IsOptional()
  @IsString()
  rawQuestion?: string;

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => QuestionSnapshotDto)
  questions!: QuestionSnapshotDto[];

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => InsightAnswerDto)
  answers!: InsightAnswerDto[];
}
```

**Apply:** Dart models must serialize `rawQuestion`, `questions`, and `answers` exactly. Keep support for backend response shape `{ questions: [...] }` and `{ conclusion: "..." }`.

---

### `clients/flutter/lib/src/features/insight/insight_api_client.dart` (service/client, request-response)

**Analog:** `backend/README.md`, `demo/web/src/lib/ai-service.ts`

**Required API headers** (`backend/README.md` lines 30-39):
```markdown
| Header | 必填 | 说明 |
|--------|------|------|
| `Authorization: Bearer <API_TOKEN>` | 是 | `<API_TOKEN>` 必须与服务端 `.env` 中的 `API_TOKEN` 完全一致；错误返回 401。 |
| `X-Device-Id` | 是 | 稳定设备标识，用于 `POST /v1/users/bootstrap` upsert 用户；缺失或空串返回 400。 |
| `X-Request-Id` | 否 | 调试关联 id；未传时服务端生成并回写响应头。 |
```

**Endpoint/body examples** (`backend/README.md` lines 47-57):
```bash
curl -s -X POST http://127.0.0.1:3000/v1/insight/questions \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "X-Device-Id: dev-device-001" \
  -H "Content-Type: application/json" \
  -d '{"rawQuestion":"我要不要换工作？","inputMode":"text"}'

curl -s -X POST http://127.0.0.1:3000/v1/insight/submit \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "X-Device-Id: dev-device-001" \
```

**Fetch wrapper pattern** (`demo/web/src/lib/ai-service.ts` lines 29-53):
```typescript
export async function chatComplete(params: {
  userText: string;
  extraSystemPrompt?: string;
  model?: string;
}): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userText: params.userText,
      extraSystemPrompt: params.extraSystemPrompt,
      model: params.model,
      stream: false,
    }),
  });

  if (!res.ok) {
    return ensurePositiveFallback(params.userText);
  }
```

**Apply:** centralize base URL, token, content type, device id, and JSON parsing. Unlike the demo web fallback, do not fabricate questions/conclusions on API failure; surface a typed client error so the card-level retry UI can render.

---

### `clients/flutter/lib/src/features/insight/device_id_store.dart` (utility/store, local persistence)

**Analog:** `ApiTokenGuard`, `demo/web/src/lib/user-store.ts`

**Server enforcement** (`backend/src/common/guards/api-token.guard.ts` lines 20-33):
```typescript
const authorization = getHeaderValue(request, 'authorization') ?? '';
const [scheme, token] = authorization.split(' ');

if (scheme !== 'Bearer' || !token || token !== expectedToken) {
  throw new UnauthorizedException('Invalid bearer token');
}

const deviceId = getHeaderValue(request, 'x-device-id')?.trim();
if (!deviceId) {
  throw new BadRequestException('X-Device-Id header is required');
}

request.deviceId = deviceId;
```

**Local stable id pattern** (`demo/web/src/lib/user-store.ts` lines 77-95):
```typescript
const userId =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `u_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const created: UserProfile = {
  userId,
  phone,
  account: phone,
  name: "",
  birthday: "",
  gender: "female",
  focusArea: "career",
  onboardingDone: false,
};
```

**Apply:** generate and persist a stable development device id locally. Keep API token configurable and never hard-code production secrets in committed Dart code.

---

### `clients/flutter/lib/src/features/insight/widgets/bottom_question_input.dart` (component, user input)

**Analog:** `Button.tsx`, `globals.css`, `02-UI-SPEC.md`

**Button touch target and press feedback** (`demo/web/src/components/ui/Button.tsx` lines 14-27):
```tsx
export function Button({ className = "", variant = "primary", ...props }: Props) {
  const base =
    "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={`${base} ${styles} ${className}`}
      {...props}
    />
  );
}
```

**Input styling precedent** (`demo/web/src/app/globals.css` lines 117-128):
```css
.ios-input {
  @apply w-full rounded-3xl border px-4 py-3 text-sm outline-none transition focus-visible:ring-2;
  color: rgb(var(--text));
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.14);
}
.ios-input::placeholder {
  color: rgba(240, 242, 255, 0.55);
}
```

**UI-SPEC contract** (`02-UI-SPEC.md` lines 142-147):
```markdown
- Bottom input follows the screenshot: white rounded capsule, soft shadow, placeholder text, green circular send button.
- Remove the left microphone/voice slot entirely. Do not show a disabled microphone.
- Send is enabled only when trimmed input has meaningful text; disabled state uses `Text secondary` and no accent fill.
- During generation/submission, input and send are disabled to prevent duplicate calls.
```

**Apply:** implement as a reusable Flutter widget using `TextField`, capsule `Container`, circular send `IconButton`/button, and disabled behavior from ViewModel state.

---

### `clients/flutter/lib/src/features/insight/widgets/question_card.dart` (component, state-driven selection)

**Analog:** `Card.tsx`, `fortune/page.tsx`, `02-UI-SPEC.md`

**Card wrapper pattern** (`demo/web/src/components/ui/Card.tsx` lines 14-27):
```tsx
return (
  <section className="glass-card min-w-0 max-w-full p-4 sm:p-6">
    {(title || subtitle || right) && (
      <header className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
        <div>
          {title && <div className="card-title">{title}</div>}
          {subtitle && <div className="app-meta mt-1">{subtitle}</div>}
        </div>
        {right}
      </header>
    )}
    <div className="app-body">{children}</div>
  </section>
);
```

**Interaction contract** (`02-UI-SPEC.md` lines 133-140):
```markdown
- Render exactly one question card at a time after the API returns the three-question snapshot.
- Store the full `raw_question`, `questions` snapshot, and selected answers in local state until submit completes.
- Selecting an option advances to the next card after a short 120-180ms pressed/selected feedback.
- On question 2 or 3, show `上一题`; returning preserves the previous selection and allows replacement.
- There is no submit overview page. Completing question 3 immediately submits all answers.
```

**Apply:** question card receives one question, progress text, selected option id, enabled flag, and callbacks. Option pills should be large rounded controls with semantic selected state.

---

### `clients/flutter/lib/src/features/insight/widgets/loading_error_card.dart` (component, loading/error display)

**Analog:** `Spinner.tsx`, `Toast.tsx`, `HttpExceptionFilter`

**Loading semantic label** (`demo/web/src/components/ui/Spinner.tsx` lines 1-7):
```tsx
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`size-5 animate-spin rounded-full border-2 border-white/25 border-t-white ${className}`}
      aria-label="loading"
    />
  );
}
```

**Transient message pattern** (`demo/web/src/components/ui/Toast.tsx` lines 13-24):
```tsx
<AnimatePresence>
  {show && (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {text}
    </motion.div>
  )}
</AnimatePresence>
```

**Backend error body** (`backend/src/common/filters/http-exception.filter.ts` lines 43-47):
```typescript
const body = this.toBody(exception, status);
response.status(status).json({
  ...body,
  requestId: getRequestId(request),
});
```

**Apply:** Phase 2 must prefer card-level errors over Toast-only display. Parse `{ code, message, requestId }`; special-case `422 INVALID_QUESTION_INPUT` to return to editable input while preserving the original text.

---

### `clients/flutter/lib/src/features/insight/widgets/result_card.dart` (component, response display)

**Analog:** `Card.tsx`, `fortune/page.tsx`, `02-UI-SPEC.md`

**Scrollable content precedent** (`demo/web/src/app/fortune/page.tsx` lines 403-431):
```tsx
<div className="relative mt-5 min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
  <div className="grid gap-3 pb-1">
    <section>
      <div className="flex flex-col rounded-2xl border border-white/18 bg-white/6 px-4 py-3">
        <div className="shrink-0 text-[11px] font-semibold tracking-[0.1em] text-white/70">
          今日建议做什么
        </div>
        <div className="mt-1.5 max-h-[min(40vh,280px)] min-h-0 overflow-y-auto overscroll-y-contain text-sm leading-relaxed text-white/90 [-webkit-overflow-scrolling:touch]">
```

**Result contract** (`02-UI-SPEC.md` lines 149-155):
```markdown
- Result card can be taller and scroll internally for long conclusion text; keep bottom actions visible.
- Option pills use 999px radius, minimum 48px height, `16px` horizontal padding, and high-contrast selected state.
```

**Apply:** conclusion text is scrollable inside the card if needed. Actions call ViewModel reset; both “再问一次” and “回到首页” return to `idle` and clear the current round.

---

### `clients/flutter/android/app/src/main/AndroidManifest.xml` and network config (platform config, network/config)

**Analog:** `clients/android/README.md`, `docs/deployment.md`

**Existing Android guidance** (`clients/android/README.md` lines 13-16):
```markdown
## 初始化薄壳时

- 在 [`../../docs/tech-stack.md`](../../docs/tech-stack.md) 已商定的**系统版本**策略下，写入具体 **minSdk** 与**包名**。  
- 备案、**网络安全配置**、**权限** 与 H5/原生边界见 [`../../docs/deployment.md`](../../docs/deployment.md) 后续补充。
```

**Production HTTPS constraint** (`docs/deployment.md` lines 351-353):
```markdown
HTTPS 可以使用阿里云 SSL 证书或 `certbot`。生产环境必须使用 HTTPS。
```

**Apply:** configure Android package/minSdk during Flutter init and document emulator Base URL behavior. If cleartext HTTP is enabled for local dev, scope it to debug/local and keep production HTTPS-only.

---

### `docs/tech-stack.md`, `docs/architecture.md`, `clients/android/README.md`, `clients/flutter/README.md` (documentation, decision sync)

**Analog:** `02-CONTEXT.md`, existing stale docs

**Locked decision requiring doc updates** (`02-CONTEXT.md` lines 14-18):
```markdown
- **D-01:** Phase 2 客户端采用 **Flutter 优先**，原因是更容易接近 Figma/截图视觉效果，并为后续 iOS 复用 UI 留路。
- **D-02:** 主工程落在 `clients/flutter`。Phase 2 只要求 Android 可运行、可联调；`clients/android` 作为说明入口，不承载主实现。
- **D-05:** 后续 planning/implementation 必须同步修正与本决定冲突的文档，包括 `docs/tech-stack.md`、`clients/android/README.md`、`clients/flutter/README.md`。
```

**Architecture conflict** (`docs/architecture.md` lines 61-70):
```markdown
| `clients/android` | **当前 MVP 主端**：原生实现登录、画像、提问、三问作答、结果反馈 |
| `clients/ios` | 试水期暂不强制；验证后再并行推进 |
| `clients/flutter` | 保持长期双端预留，是否启用取决于试水结果与资源 |
```

**Apply:** update docs as part of Phase 2 implementation planning so team-facing docs no longer contradict `02-CONTEXT.md`.

## Shared Patterns

### API Auth And Headers
**Source:** `backend/src/common/guards/api-token.guard.ts`, `backend/README.md`
**Apply to:** `insight_api_client.dart`, local config docs, device id store
```typescript
const authorization = getHeaderValue(request, 'authorization') ?? '';
const [scheme, token] = authorization.split(' ');

if (scheme !== 'Bearer' || !token || token !== expectedToken) {
  throw new UnauthorizedException('Invalid bearer token');
}

const deviceId = getHeaderValue(request, 'x-device-id')?.trim();
if (!deviceId) {
  throw new BadRequestException('X-Device-Id header is required');
}
```

### Stateless Submit Shape
**Source:** `backend/src/insight/dto/submit-insight.dto.ts`
**Apply to:** ViewModel, models, API client, tests
```typescript
export class SubmitInsightDto {
  @IsOptional()
  @IsString()
  rawQuestion?: string;

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => QuestionSnapshotDto)
  questions!: QuestionSnapshotDto[];

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => InsightAnswerDto)
  answers!: InsightAnswerDto[];
}
```

### Error Body Parsing
**Source:** `backend/src/common/filters/http-exception.filter.ts`, `docs/tasks/003-phase1-api-auth-headers.md`
**Apply to:** API client and error card
```json
{
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "requestId": "uuid-or-client-provided-id"
}
```

### Single-Screen State Machine
**Source:** `02-UI-SPEC.md`
**Apply to:** `insight_flow_screen.dart`, `insight_view_model.dart`, widgets
```markdown
| `idle` | Soft empty homepage; the empty-state heading/body and bottom input capsule are the primary visual anchor; input enabled, no chat history list |
| `generatingQuestions` | Card-level loading with “正在整理你的三问…” and light breathing/typing motion |
| `answeringQuestion` | One question card at a time, progress `第 1 / 3 问`, options shown as large rounded pills |
| `submittingAnswers` | Existing selected answers remain visible; current card shows “正在生成倾向分析…” and actions disabled |
| `showingResult` | Result card with conclusion text and bottom actions “再问一次” and “回到首页” |
| `error` | Card-level error at the current failed step, retry scoped to that step |
```

### Mobile Surface And Touch Targets
**Source:** `demo/web/src/app/globals.css`, `Button.tsx`, `02-UI-SPEC.md`
**Apply to:** all Flutter widgets
```css
.mobile-shell {
  width: 100%;
  max-width: min(480px, 100%);
  margin-left: auto;
  margin-right: auto;
  min-height: 100dvh;
  overflow-x: hidden;
  padding-top: calc(var(--safe-top) + 8px);
  padding-left: max(14px, var(--safe-left));
  padding-right: max(14px, var(--safe-right));
}
```

```tsx
const base =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";
```

### Tests
**Source:** `backend/src/insight/insight-submit.validation.test.ts`
**Apply to:** ViewModel/API client tests once Flutter test files exist
```typescript
async function assertInvalidSubmit(dto: SubmitInsightDto) {
  const { service, counters } = createService();

  await assert.rejects(
    () =>
      service.submitInsight(dto, {
        requestId: 'req-test',
        deviceId: 'device-test',
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpException);
      assert.equal(error.getStatus(), 422);
      assert.equal(
        (error.getResponse() as { code?: string }).code,
        INVALID_CODE,
      );
      return true;
    },
  );
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `clients/flutter/pubspec.yaml` generated Flutter project metadata | config | dependency/config | No Flutter project is initialized yet; use standard `flutter create` output plus Phase 2 dependency decisions. |
| `clients/flutter/lib/src/features/insight/*` Flutter implementation files | Flutter UI/view model/service | request-response UI state machine | No Dart/Flutter source analog exists in the repo; planner should use the backend API contract, UI-SPEC, and demo web patterns above as the closest local references. |

## Metadata

**Analog search scope:** `clients/**`, `demo/web/src/**`, `backend/src/**`, `docs/**`, `.planning/codebase/**`
**Files scanned:** 32 web files, 28 backend TypeScript files, 3 client placeholder files, planning/docs references
**Pattern extraction date:** 2026-05-10
