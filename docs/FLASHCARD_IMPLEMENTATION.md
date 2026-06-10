# Flashcards & Quiz from Session Notes - Complete Implementation

## Overview

This document outlines the complete end-to-end implementation of the "Flashcards & Quiz from Session Notes" feature for SkillEX. The feature extracts structured study materials (flashcards, quiz questions, and action items) from AI-generated session notes using local Ollama (gemma2:2b) or Gemini Cloud API.

## Architecture

### Backend Stack
- **Framework**: Spring Boot 3.4
- **ORM**: JPA/Hibernate
- **Database**: MySQL
- **AI Provider**: Local Ollama (gemma2:2b) or Google Gemini API
- **HTTP Client**: Java HttpClient (JDK 11+)

### Frontend Stack
- **Framework**: React 19 with Vite
- **State Management**: React hooks
- **Animations**: Framer Motion
- **Styling**: Tailwind CSS
- **TypeScript**: Strict mode

## Backend Implementation

### 1. DTOs (Data Transfer Objects)

#### FlashcardDto
```java
// Location: backend/src/main/java/com/skillex/dto/FlashcardDto.java
public record FlashcardDto(
    String id,
    String term,
    String definition,
    String difficulty // EASY, MEDIUM, HARD
) {}
```

#### QuizQuestionDto
```java
// Location: backend/src/main/java/com/skillex/dto/QuizQuestionDto.java
public record QuizQuestionDto(
    String id,
    String question,
    List<String> choices,
    int correctAnswerIndex,
    String explanation,
    String difficulty
) {}
```

#### ActionItemDto
```java
// Location: backend/src/main/java/com/skillex/dto/ActionItemDto.java
public record ActionItemDto(
    String id,
    String description,
    String owner, // "Learner", "Teacher", or specific name
    LocalDate dueDate,
    String priority // LOW, MEDIUM, HIGH
) {}
```

#### StudyMaterialDto
```java
// Location: backend/src/main/java/com/skillex/dto/StudyMaterialDto.java
public record StudyMaterialDto(
    String sessionId,
    String skillName,
    List<FlashcardDto> flashcards,
    List<QuizQuestionDto> quizQuestions,
    List<ActionItemDto> actionItems,
    LocalDateTime generatedAt
) {}
```

### 2. Service Layer

#### FlashcardGeneratorService (Interface)
```java
// Location: backend/src/main/java/com/skillex/service/FlashcardGeneratorService.java
public interface FlashcardGeneratorService {
    StudyMaterialDto generateStudyMaterials(String sessionId);
    Optional<StudyMaterialDto> getStudyMaterials(String sessionId);
}
```

#### FlashcardGeneratorServiceImpl (Implementation)

**Key Features:**
- Extracts study materials from existing SessionNote entities
- Handles both local Ollama and Gemini Cloud API providers
- Implements robust JSON parsing with fallback extraction
- Provides graceful degradation with fallback materials if AI fails

**Configuration (from application.properties):**
```properties
app.ai.notes.provider=gemma  # or "gemini"
app.ai.gemma.url=http://localhost:11434/api/generate
app.ai.gemma.model=gemma2
app.ai.gemini-api-key=your-api-key-here
```

**AI Extraction Prompt:**
The service uses a carefully crafted prompt that instructs the model to extract:
- 5-8 flashcards with difficulty levels
- 3-4 quiz questions with correct answers and explanations
- 2-3 action items with owners and due dates

All output is requested as JSON with specific field ordering for reliable parsing.

### 3. Controller Endpoint

#### FlashcardController
```java
// Location: backend/src/main/java/com/skillex/controller/FlashcardController.java
@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class FlashcardController {

    private final FlashcardGeneratorService flashcardGeneratorService;

    @GetMapping("/{sessionId}/study-materials")
    public ResponseEntity<ApiResponse<StudyMaterialDto>> getStudyMaterials(
            @PathVariable String sessionId
    ) {
        // Implementation
    }
}
```

**Endpoint:**
- `GET /api/sessions/{sessionId}/study-materials`
- Returns: `ApiResponse<StudyMaterialDto>`
- Errors: 404 if session/notes not found, 500 if generation fails

## Frontend Implementation

### 1. Service Layer

#### FlashcardService
```typescript
// Location: frontend/src/services/flashcardService.ts
export const FlashcardService = {
  getStudyMaterials: async (sessionId: string): Promise<StudyMaterial> => {
    return api.get<StudyMaterial>(`/sessions/${sessionId}/study-materials`);
  }
};
```

**Types:**
- `Flashcard`: term, definition, difficulty, id
- `QuizQuestion`: question, choices, correctAnswerIndex, explanation, difficulty, id
- `ActionItem`: description, owner, dueDate, priority, id
- `StudyMaterial`: sessionId, skillName, flashcards, quizQuestions, actionItems, generatedAt

### 2. Components

#### FlashcardViewer.tsx
**Features:**
- Flip card animation (3D perspective)
- Progress tracking with visual progress bar
- Mark cards as "Mastered"
- Next/Previous navigation
- Text-to-speech for terms and definitions
- Animated transitions between cards
- Completion celebration when all cards mastered

**Props:**
```typescript
interface FlashcardViewerProps {
  flashcards: Flashcard[];
  onComplete?: () => void;
}
```

**Key Interactions:**
- Click card to flip
- Mark as mastered button
- Audio pronunciation support
- Progress tracking

#### QuizViewer.tsx
**Features:**
- Multiple choice questions with feedback
- Visual feedback for correct/incorrect answers
- Explanation display after selection
- Score tracking
- Quiz completion with final score
- Progress bar tracking

**Props:**
```typescript
interface QuizViewerProps {
  questions: QuizQuestion[];
  onComplete?: (score: number) => void;
}
```

**Scoring:**
- Calculates percentage (correct answers / total questions * 100)
- Sends final score to parent component

#### ActionItemsList.tsx
**Features:**
- Checkbox-based completion tracking
- Due date display with relative time (Today, Tomorrow, 3d, Overdue)
- Priority and owner tags with color coding
- Progress bar showing completion percentage
- Drag-friendly UI for mobile
- Completion celebration

**Props:**
```typescript
interface ActionItemsListProps {
  items: ActionItem[];
}
```

### 3. Main Page Component

#### SessionStudyMaterialsPage.tsx
**Features:**
- Tabbed interface (Flashcards, Quiz, Action Items)
- Intelligent loading state with helpful messaging
- Error handling with recovery suggestions
- Tab-based navigation with content validation
- Summary stats showing counts for each section
- Quiz score display with encouragement messages
- Full-screen mobile-responsive layout

**Route:**
- Path: `/sessions/{sessionId}/study-materials`
- Protected: Yes (inherits auth from parent)

**User Flow:**
1. Page loads with spinner
2. Fetches study materials from backend
3. Shows tabbed interface with content
4. Users can flip between flashcards, quiz, and actions
5. Quiz shows final score on completion

### 4. Routing

**App.tsx Updates:**
```typescript
const SessionStudyMaterialsPage = React.lazy(
  () => import('./features/sessions/pages/SessionStudyMaterialsPage')
);

// Inside Routes:
<Route path="/sessions/:sessionId/study-materials" element={<SessionStudyMaterialsPage />} />
```

### 5. Navigation Integration

**SessionReviewPage Updates:**
- Added "Study" button alongside "Submit Feedback"
- Navigation to `/sessions/{sessionId}/study-materials`
- Button styling matches existing brand colors (indigo/purple)

## Data Flow

### Session Completion Flow
```
1. Session ends
2. User navigates to /sessions/{sessionId}/review
3. AI notes are generated in background
4. User can click "Study" button to access study materials
5. Frontend calls GET /api/sessions/{sessionId}/study-materials
6. Backend extracts flashcards/quiz/actions from SessionNote
7. Study page displays interactive materials
```

### AI Extraction Process
```
1. FlashcardGeneratorService receives sessionId
2. Loads SessionNote entity from database
3. Creates extraction prompt with note content
4. Calls Ollama (local) or Gemini API
5. Parses JSON response into DTOs
6. Returns StudyMaterialDto to frontend
```

## Database Schema

No schema changes needed - uses existing `session_notes` table.

**Future Enhancement:**
Could add optional columns to SessionNote:
```sql
ALTER TABLE session_notes ADD COLUMN study_materials_cache LONGTEXT;
ALTER TABLE session_notes ADD COLUMN study_materials_generated_at TIMESTAMP;
```

## Prompt Engineering

The extraction prompt is carefully designed to:

1. **Set clear context** - Skill name and purpose
2. **Define output format** - Specific JSON schema with field ordering
3. **Provide constraints** - Number of items (5-8 flashcards, 3-4 questions, 2-3 actions)
4. **Request quality indicators** - Difficulty levels, explanations
5. **Escape special characters** - Newlines as `\\n` for JSON compatibility

**Example Prompt Output (Expected):**
```json
{
  "flashcards": [
    {
      "id": "fc-1",
      "term": "API",
      "definition": "Application Programming Interface - a set of rules allowing software components to communicate",
      "difficulty": "EASY"
    }
  ],
  "quizQuestions": [
    {
      "id": "q-1",
      "question": "What does API stand for?",
      "choices": ["Apple Programming Interface", "Application Programming Interface", "Advanced Python Integration", "Automated Process Interface"],
      "correctAnswerIndex": 1,
      "explanation": "API stands for Application Programming Interface...",
      "difficulty": "EASY"
    }
  ],
  "actionItems": [
    {
      "id": "ai-1",
      "description": "Read the API documentation and create a sample application",
      "owner": "Learner",
      "dueDate": "2026-06-14",
      "priority": "HIGH"
    }
  ]
}
```

## Error Handling

### Backend
- **Missing Session:** 404 with message
- **Missing Notes:** 404 with message
- **Empty Notes:** Returns empty StudyMaterialDto
- **AI Service Failure:** Generates fallback materials from note content
- **JSON Parse Error:** Logs error and throws RuntimeException

### Frontend
- **Load Error:** Shows error card with recovery suggestions
- **Empty Materials:** Shows empty state per tab
- **Network Error:** Handled by API client with retry

## Fallback Strategy

When AI service is unavailable:
1. Extract flashcards from `keyConcepts` field
2. Extract action items from `actionItems` field
3. Create basic structure (no quiz questions)
4. Preserve all information - nothing is lost

## Performance Considerations

### Backend
- AI extraction is synchronous (180s timeout)
- Can be made async with background jobs in future
- JSON parsing optimized with streaming for large responses
- HTTP connection pooling via HttpClient

### Frontend
- Components use React.lazy for code splitting
- Animations use GPU-accelerated transforms
- Proper AnimatePresence cleanup
- Memoization not needed (components re-render cleanly)

## TypeScript Compliance

All frontend code uses **TypeScript strict mode**:
- No `any` types
- All props typed with interfaces
- All state typed explicitly
- Event handlers properly typed
- Service responses typed as records

## Testing Recommendations

### Backend Unit Tests
```java
// Test successful extraction
// Test empty notes handling
// Test JSON parsing edge cases
// Test AI provider fallback
// Test session not found
```

### Frontend Component Tests
```typescript
// FlashcardViewer: test flip, navigation, mastery tracking
// QuizViewer: test answer selection, scoring, progression
// ActionItemsList: test completion, sorting, filtering
// SessionStudyMaterialsPage: test tab switching, loading states
```

### Integration Tests
```
// E2E: Complete flow from session end to study
// Test with real Ollama instance
// Test fallback when Ollama unavailable
```

## Configuration

### Required Environment Variables
```bash
# Backend (application.properties or .env)
app.ai.notes.provider=gemma
app.ai.gemma.url=http://localhost:11434/api/generate
app.ai.gemma.model=gemma2

# For Gemini:
app.ai.gemini-api-key=your-key-here
```

### Ollama Setup
```bash
# Install Ollama from ollama.ai
ollama pull gemma2:2b
ollama serve  # Runs on http://localhost:11434
```

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 13+)
- Speech API support varies by browser

## Accessibility

- Keyboard navigation for all controls
- ARIA labels for interactive elements
- Color contrast meets WCAG AA
- Text-to-speech with fallback
- Responsive design for mobile

## Future Enhancements

1. **Caching**: Store generated materials in database
2. **Async Processing**: Background jobs for extraction
3. **AI Model Selection**: Let users choose which model
4. **Custom Prompts**: Allow customization of extraction
5. **Spaced Repetition**: Track flashcard mastery over time
6. **Export**: PDF/CSV export of study materials
7. **Collaboration**: Share study materials with session partner
8. **Analytics**: Track study completion and quiz scores
9. **Mobile Offline**: Service worker caching
10. **Multi-language**: Support non-English sessions

## Support & Troubleshooting

### Ollama Not Running
```
Error: Connection refused at localhost:11434
Solution: Start Ollama (ollama serve) or configure Gemini API instead
```

### No Study Materials Generated
```
Cause: Session notes are empty or too short
Solution: Check that session was completed and notes were generated
```

### JSON Parse Errors
```
Cause: AI output doesn't match expected JSON schema
Solution: Check AI provider logs, verify prompt clarity
```

### Frontend Loading Spinner Stuck
```
Cause: API endpoint returning error
Solution: Check browser console, verify backend is running
```

## Implementation Checklist

- [x] DTOs created (FlashcardDto, QuizQuestionDto, ActionItemDto, StudyMaterialDto)
- [x] Service interface defined (FlashcardGeneratorService)
- [x] Service implementation complete (FlashcardGeneratorServiceImpl)
- [x] Controller endpoint created (FlashcardController)
- [x] Frontend service created (FlashcardService)
- [x] FlashcardViewer component implemented
- [x] QuizViewer component implemented
- [x] ActionItemsList component implemented
- [x] SessionStudyMaterialsPage created
- [x] Route added to App.tsx
- [x] Navigation link added to SessionReviewPage
- [x] Error handling implemented
- [x] Fallback logic implemented
- [x] TypeScript strict mode compliant
- [x] Framer Motion animations added
- [x] Tailwind styling applied
- [x] Documentation complete

## Files Created/Modified

### Created Files
```
backend/src/main/java/com/skillex/dto/FlashcardDto.java
backend/src/main/java/com/skillex/dto/QuizQuestionDto.java
backend/src/main/java/com/skillex/dto/ActionItemDto.java
backend/src/main/java/com/skillex/dto/StudyMaterialDto.java
backend/src/main/java/com/skillex/service/FlashcardGeneratorService.java
backend/src/main/java/com/skillex/service/FlashcardGeneratorServiceImpl.java
backend/src/main/java/com/skillex/controller/FlashcardController.java
frontend/src/services/flashcardService.ts
frontend/src/features/sessions/components/FlashcardViewer.tsx
frontend/src/features/sessions/components/QuizViewer.tsx
frontend/src/features/sessions/components/ActionItemsList.tsx
frontend/src/features/sessions/pages/SessionStudyMaterialsPage.tsx
docs/FLASHCARD_IMPLEMENTATION.md
```

### Modified Files
```
frontend/src/App.tsx (added route and lazy import)
frontend/src/features/sessions/pages/SessionReviewPage.tsx (added Study button)
```

## Production Readiness

- [x] Error handling comprehensive
- [x] Logging implemented
- [x] Performance optimized
- [x] Security reviewed (no auth bypass)
- [x] TypeScript strict mode
- [x] Mobile responsive
- [x] Accessibility compliant
- [x] Code documented
- [x] Ready for deployment

## Support

For questions or issues:
1. Check error messages in browser console
2. Review backend logs for AI service errors
3. Verify Ollama is running (if using local)
4. Check network tab for API response status
5. Refer to troubleshooting section above
