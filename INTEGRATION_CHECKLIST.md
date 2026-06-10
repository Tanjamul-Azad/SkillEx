# Integration Checklist - Flashcards Feature

Use this checklist to ensure complete integration of the flashcards feature into your SkillEX project.

## Phase 1: Backend Integration (20 minutes)

### Step 1.1: Create DTO Files
- [ ] Copy `FlashcardDto.java` to `backend/src/main/java/com/skillex/dto/`
- [ ] Copy `QuizQuestionDto.java` to `backend/src/main/java/com/skillex/dto/`
- [ ] Copy `ActionItemDto.java` to `backend/src/main/java/com/skillex/dto/`
- [ ] Copy `StudyMaterialDto.java` to `backend/src/main/java/com/skillex/dto/`

**Verify:**
```bash
cd backend
mvn compile -pl . -am
# Should compile without errors
```

### Step 1.2: Create Service Files
- [ ] Copy `FlashcardGeneratorService.java` to `backend/src/main/java/com/skillex/service/`
- [ ] Copy `FlashcardGeneratorServiceImpl.java` to `backend/src/main/java/com/skillex/service/`

**Verify:**
- [ ] No duplicate class errors
- [ ] All imports resolve

### Step 1.3: Create Controller File
- [ ] Copy `FlashcardController.java` to `backend/src/main/java/com/skillex/controller/`

**Verify:**
```bash
mvn clean compile
# Should compile successfully
```

### Step 1.4: Configure Application Properties
- [ ] Open `application.properties` or `application.yml`
- [ ] Add (or verify existing):

```properties
# AI Provider Configuration
app.ai.notes.provider=gemma
app.ai.gemma.url=http://localhost:11434/api/generate
app.ai.gemma.model=gemma2

# For Gemini Cloud (optional):
# app.ai.gemini-api-key=your-key-here
```

- [ ] Save configuration

### Step 1.5: Verify Ollama (if using local)
- [ ] Install Ollama from https://ollama.ai
- [ ] Run: `ollama pull gemma2:2b`
- [ ] Run: `ollama serve`
- [ ] Verify: `curl http://localhost:11434/api/tags` returns models

### Step 1.6: Test Backend Endpoint
```bash
# Start backend
cd backend
mvn spring-boot:run

# In another terminal, test the endpoint
curl http://localhost:8080/api/sessions/test-id/study-materials

# Expected response: 404 (session not found) or 200 (with materials)
```

- [ ] Backend is running and endpoint responds

## Phase 2: Frontend Integration (15 minutes)

### Step 2.1: Create Service File
- [ ] Copy `flashcardService.ts` to `frontend/src/services/`

**Verify:**
```bash
cd frontend
npm run type-check
# Should have no type errors
```

### Step 2.2: Create Component Files
- [ ] Copy `FlashcardViewer.tsx` to `frontend/src/features/sessions/components/`
- [ ] Copy `QuizViewer.tsx` to `frontend/src/features/sessions/components/`
- [ ] Copy `ActionItemsList.tsx` to `frontend/src/features/sessions/components/`

**Verify:**
```bash
npm run type-check
# All components should type-check successfully
```

### Step 2.3: Create Page File
- [ ] Copy `SessionStudyMaterialsPage.tsx` to `frontend/src/features/sessions/pages/`

**Verify:**
- [ ] No compilation errors
- [ ] All imports are available

### Step 2.4: Update App Router
- [ ] Open `frontend/src/App.tsx`
- [ ] Find the lazy imports section (line ~34-43)
- [ ] **Verify this import exists:**
```typescript
const SessionStudyMaterialsPage = React.lazy(() => import('./features/sessions/pages/SessionStudyMaterialsPage'));
```

- [ ] Find the Routes section (line ~150-160)
- [ ] **Verify this route exists:**
```typescript
<Route path="/sessions/:sessionId/study-materials" element={<SessionStudyMaterialsPage />} />
```

If not already present (it should be from the provided files):
- [ ] Add the import after `SessionReviewPage` import
- [ ] Add the route after the SessionReviewPage route

### Step 2.5: Update SessionReviewPage
- [ ] Open `frontend/src/features/sessions/pages/SessionReviewPage.tsx`
- [ ] **Verify this import exists (should have Zap added):**
```typescript
import { Star, Sparkles, CheckCircle2, ArrowRight, BookOpen, Clock, RefreshCw, Zap } from 'lucide-react';
```

- [ ] Find the button area (line ~179-186, inside the form)
- [ ] **Verify the Study button exists in a grid with Submit:**
```typescript
<div className="grid grid-cols-2 gap-2">
  <button type="submit" /* existing submit button code */>
    Submit
  </button>
  <button
    type="button"
    onClick={() => sessionId && navigate(`/sessions/${sessionId}/study-materials`)}
    className="bg-gradient-to-r from-indigo-500/80 to-purple-500/80 hover:from-indigo-500 hover:to-purple-500 text-white py-3 rounded-xl text-xs font-bold transition duration-300 flex items-center justify-center gap-2"
  >
    <Zap className="h-4 w-4" />
    Study
  </button>
</div>
```

### Step 2.6: Test Frontend
```bash
# Start frontend
npm run dev

# Navigate to http://localhost:5173
# Login and complete a session
# Click "Study" button on review page
# Should navigate to study materials page
```

- [ ] Frontend loads without errors
- [ ] Routes resolve correctly
- [ ] Study button appears on review page

## Phase 3: End-to-End Testing (15 minutes)

### Test 1: Complete Flow
- [ ] [ ] Start both backend and frontend services
- [ ] [ ] Log in as a user
- [ ] [ ] Complete a session
- [ ] [ ] Navigate to session review page
- [ ] [ ] See "Study" button next to "Submit" button
- [ ] [ ] Click "Study" button
- [ ] [ ] Study materials page loads (spinning loader)
- [ ] [ ] Materials load successfully (Flashcards, Quiz, Actions tabs)
- [ ] [ ] Can switch between tabs

### Test 2: Flashcard Interaction
- [ ] [ ] Click on flashcard to flip
- [ ] [ ] See definition on back
- [ ] [ ] Click "Mark as Mastered" button
- [ ] [ ] Navigate to next card with arrow buttons
- [ ] [ ] Progress bar updates
- [ ] [ ] Text-to-speech button works (if supported)

### Test 3: Quiz Interaction
- [ ] [ ] Switch to Quiz tab
- [ ] [ ] See multiple-choice question
- [ ] [ ] Click on an answer choice
- [ ] [ ] See feedback (correct/incorrect)
- [ ] [ ] See explanation
- [ ] [ ] Click "Next" to go to next question
- [ ] [ ] Final screen shows score percentage

### Test 4: Action Items
- [ ] [ ] Switch to Action Items tab
- [ ] [ ] See list of tasks with due dates
- [ ] [ ] Check off an action item
- [ ] [ ] See progress bar update
- [ ] [ ] Verify owner/priority tags display

### Test 5: Error Handling
- [ ] [ ] Test with session that has no notes (empty state)
- [ ] [ ] Test with invalid session ID (error page)
- [ ] [ ] Stop backend, refresh page (error message)
- [ ] [ ] Resume backend (recovery works)

## Phase 4: Verification (10 minutes)

### Functionality Checks
- [ ] API endpoint responds: `GET /api/sessions/{id}/study-materials`
- [ ] Returns correct StudyMaterialDto structure
- [ ] Flashcards display correctly
- [ ] Quiz scoring works
- [ ] Action items track completion
- [ ] Navigation between tabs works
- [ ] Animations are smooth
- [ ] Mobile layout is responsive

### Code Quality Checks
```bash
# Backend
mvn clean verify

# Frontend
npm run type-check
npm run build

# Check for console errors (DevTools)
```

- [ ] Backend compiles successfully
- [ ] Frontend type-checks successfully
- [ ] No compilation errors
- [ ] No console errors/warnings

### Browser Compatibility
- [ ] Chrome/Chromium: Works
- [ ] Firefox: Works
- [ ] Safari: Works
- [ ] Mobile browser: Works

## Phase 5: Configuration Verification (5 minutes)

### Verify Settings
- [ ] [ ] `app.ai.notes.provider` is set correctly
- [ ] [ ] Ollama URL is correct (if using local)
- [ ] [ ] Model name is correct
- [ ] [ ] Gemini API key is set (if using cloud)

### Test Provider Selection
If using **Ollama (local)**:
- [ ] [ ] Ollama is running: `ollama serve`
- [ ] [ ] Can curl: `curl http://localhost:11434/api/tags`
- [ ] [ ] Response includes gemma2 model

If using **Gemini API**:
- [ ] [ ] API key is valid
- [ ] [ ] API is enabled in Google Cloud
- [ ] [ ] No rate limiting issues

## Phase 6: Deployment Readiness (10 minutes)

### Code Review
- [ ] [ ] All files copied correctly
- [ ] [ ] No hardcoded values
- [ ] [ ] Configuration externalized
- [ ] [ ] Error handling comprehensive
- [ ] [ ] Logging configured
- [ ] [ ] Comments/docs present

### Performance Check
- [ ] [ ] Page loads quickly (<3s with network)
- [ ] [ ] No memory leaks (check DevTools)
- [ ] [ ] Animations are smooth (60fps)
- [ ] [ ] No console errors
- [ ] [ ] No memory warnings

### Security Review
- [ ] [ ] No sensitive data in logs
- [ ] [ ] API auth is respected
- [ ] [ ] CORS is configured (if needed)
- [ ] [ ] Input validation present
- [ ] [ ] SQL injection prevention (using JPA)

## Troubleshooting During Integration

### Backend Issues

**Error: Cannot find symbol FlashcardGeneratorService**
- Solution: Verify service files are in `backend/src/main/java/com/skillex/service/`
- Run: `mvn clean compile`

**Error: Connection refused to Ollama**
- Solution: Start Ollama: `ollama serve`
- Or switch to Gemini API in configuration
- Verify port 11434 is not blocked

**Error: No study materials generated**
- Check: Session notes exist and are not empty
- Verify: AI service (Ollama/Gemini) is running
- Check: Backend logs for extraction errors

### Frontend Issues

**Error: Cannot find module 'flashcardService'**
- Solution: Verify file exists at `frontend/src/services/flashcardService.ts`
- Run: `npm install` (shouldn't be needed but just in case)

**Error: SessionStudyMaterialsPage is undefined**
- Solution: Check the lazy import in App.tsx
- Verify: File exists at `frontend/src/features/sessions/pages/SessionStudyMaterialsPage.tsx`

**Study button not appearing**
- Solution: Check SessionReviewPage.tsx is updated
- Verify: Zap icon is imported from lucide-react

**Route not found**
- Solution: Verify route is added to App.tsx Routes
- Path should be: `/sessions/:sessionId/study-materials`

### Quick Fixes

```bash
# Clear caches and rebuild
npm run clean
npm install
npm run type-check

# Backend
mvn clean install
mvn spring-boot:run
```

## Sign-Off Checklist

- [ ] All 13 files integrated
- [ ] Configuration updated
- [ ] Backend compiles and runs
- [ ] Frontend builds without errors
- [ ] All routes work correctly
- [ ] E2E flow tested
- [ ] Error handling verified
- [ ] Performance acceptable
- [ ] Documentation reviewed
- [ ] Ready for production

## Final Verification

Run this test script:

```bash
# 1. Backend health
curl http://localhost:8080/api/health

# 2. Endpoint check (should give 404 or 200)
curl http://localhost:8080/api/sessions/test/study-materials

# 3. Frontend build
npm run build
# Should complete successfully

# 4. Check bundle size
# Study materials code should be <50KB gzipped
```

## Success Indicators

- ✓ All files in place
- ✓ Code compiles/builds
- ✓ No runtime errors
- ✓ Feature flows end-to-end
- ✓ UI renders correctly
- ✓ API responds with correct data
- ✓ Error handling works
- ✓ Mobile responsive
- ✓ Performance acceptable

## Need Help?

Refer to:
1. **Quick Start**: `FLASHCARD_QUICK_START.md`
2. **Full Implementation**: `docs/FLASHCARD_IMPLEMENTATION.md`
3. **Code Comments**: Review source files for detailed docs
4. **Summary**: `IMPLEMENTATION_SUMMARY.md`

## Estimated Total Time

- Backend Integration: 20 min
- Frontend Integration: 15 min
- Testing: 15 min
- Verification: 10 min
- Troubleshooting: 10 min
- **Total: 70 minutes (1 hour 10 minutes)**

---

**Status:** Ready for integration ✓

All files are production-ready and fully documented.
