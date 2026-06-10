# AI Profile Assistant Feature - Implementation Guide

## Overview

The AI Profile Assistant is a production-ready feature that helps users create polished, professional profile content using local Ollama AI. Users can:

1. **Generate Professional Bios** - Input a rough self-description and get 3 polished variations
2. **Polish Skill Descriptions** - Create compelling descriptions for each skill by level
3. **Create Circle Blurbs** - Engage communities with well-written group descriptions

The feature uses **local Ollama** (gemma2 model) for privacy, gracefully degrading to placeholders if unavailable.

## Architecture

### Backend Stack
- **Spring Boot 3.4**
- **MySQL** - for future audit/history (if needed)
- **Ollama** - local LLM for text generation
- **Jackson** - JSON serialization

### Frontend Stack
- **React 19** with **Vite**
- **React Router** for navigation
- **Framer Motion** for animations
- **Radix UI** components

## Implementation Files

### Backend

#### DTOs (in `backend/src/main/java/com/skillex/dto/ai/`)

1. **ProfileAssistantSuggestionDto.java** - Response with 3 suggestions
   ```java
   record ProfileAssistantSuggestionDto(
       List<String> suggestions,
       String generatedAt,
       String model
   ) {}
   ```

2. **GeneratedBioDto.java** - Request for bio suggestions
   ```java
   record GeneratedBioDto(
       @NotBlank String topic
   ) {}
   ```

3. **SkillDescriptionDto.java** - Request for skill descriptions
   ```java
   record SkillDescriptionDto(
       @NotBlank String skillName,
       @NotBlank String level
   ) {}
   ```

4. **CircleBlurbDto.java** - Request for circle blurbs
   ```java
   record CircleBlurbDto(
       @NotBlank String circleName,
       @NotBlank String topic
   ) {}
   ```

#### Service Layer

**ProfileAssistantService.java** - Interface defining three generation methods:
- `suggestBios(String topic)` - Generate 3 bios
- `suggestSkillDescriptions(String skillName, String level)` - Generate 3 skill descriptions
- `suggestCircleBlurbs(String circleName, String topic)` - Generate 3 circle blurbs

**ProfileAssistantServiceImpl.java** - Implementation:
- Calls local Ollama endpoint at `/api/generate`
- Configurable model (default: gemma2)
- Graceful fallback to placeholder suggestions on error
- Robust JSON parsing for array responses
- Supports regeneration via "temperature" parameter

#### Controller

**ProfileAssistantController.java** - REST endpoints:

```
POST /api/ai/profile-assistant/suggest-bio
Body: { "topic": "string" }
Response: { data: { suggestions: ["...", "...", "..."], generatedAt, model } }

POST /api/ai/profile-assistant/suggest-skill-description
Body: { "skillName": "string", "level": "string" }
Response: { data: { suggestions: ["...", "...", "..."], generatedAt, model } }

POST /api/ai/profile-assistant/suggest-circle-blurb
Body: { "circleName": "string", "topic": "string" }
Response: { data: { suggestions: ["...", "...", "..."], generatedAt, model } }
```

### Frontend

#### Service Layer

**profileAssistantService.ts** - HTTP client wrapper:
```typescript
export const profileAssistantService = {
  async suggestBios(topic: string): Promise<ProfileAssistantSuggestion>
  async suggestSkillDescriptions(skillName, level): Promise<ProfileAssistantSuggestion>
  async suggestCircleBlurbs(circleName, topic): Promise<ProfileAssistantSuggestion>
}
```

#### Components

1. **BioSuggestionModal.tsx** - Modal for bio generation
   - Input: textarea for user's self-description
   - Output: 3 selectable suggestions with copy/use buttons
   - Features: Copy to clipboard, apply to profile, regenerate

2. **SkillDescriptionEditor.tsx** - Modal for skill description editing
   - Input: skill name, level, optional current description
   - Output: AI-generated suggestions or manual edit
   - Features: Get suggestions, use suggestion, manual edit, save

3. **ProfileAssistantPage.tsx** - Main feature page
   - Three feature cards (Bio, Skills, Circles)
   - How it works section
   - Tips for better results
   - Manages modal states and user data updates

#### Routes

- `/profile-assistant` - Main feature page

## Configuration

### Environment Variables (application.properties or application.yml)

```yaml
app:
  ai:
    notes:
      provider: gemma           # or "gemini" for cloud API
    gemma:
      url: http://localhost:11434/api/generate
      model: gemma2            # Local Ollama model name
```

### Ollama Setup

Ensure Ollama is running locally:
```bash
ollama serve
ollama pull gemma2  # or your preferred model
```

## Usage Flow

### Bio Generation
1. User navigates to `/profile-assistant` or clicks "AI Bio Assistant" in settings
2. User types rough self-description
3. Click "Generate Suggestions"
4. Receives 3 polished variations
5. Can copy, regenerate, or apply one-click
6. Selected bio updates user profile instantly

### Skill Description Enhancement
1. User selects a skill from their profile
2. Opens skill description editor
3. Clicks "Get AI Suggestions"
4. Receives 3 variations specific to skill + level
5. Can use suggestion, copy, or edit manually
6. Saves to profile

### Circle Blurb Creation
1. User creates/manages a skill circle
2. Opens circle settings
3. Enters circle name and topic
4. Gets 3 AI-generated blurb options
5. Applies best option to circle description

## Error Handling

### Ollama Unavailable
- **Behavior**: Returns 3 generic placeholder suggestions
- **Logging**: Warns in console logs
- **User Experience**: Seamless - user never knows AI is offline

### Malformed Responses
- **Behavior**: Falls back to extracting raw text or placeholders
- **Robustness**: Tries JSON parsing → regex extraction → fallback
- **Impact**: Feature never breaks, worst case returns basic templates

### Network Errors
- **Retry**: Single attempt, no retry loop (respects user time)
- **Timeout**: 60 seconds max per request
- **UI Feedback**: Toast notification on failure

## Performance Considerations

- **Temperature**: 0.7 for more creative variations (not 0.3 for deterministic outputs)
- **Model Context**: 2048 tokens limit per request
- **Output Tokens**: Max 512 to keep responses concise
- **Timeout**: 60-second HTTP timeout (Ollama can be slow on first run)
- **Caching**: No frontend caching; fresh suggestions each time

## Security

1. **No User Data to Ollama**: Prompts don't contain user ID/email
2. **Local Only**: Ollama runs on user's machine, not cloud
3. **Validation**: All inputs validated via `@NotBlank`
4. **CORS**: Respects Spring Security authentication

## Testing

### Backend Test Cases
```java
// 1. Test successful Ollama call with valid JSON response
// 2. Test graceful fallback when Ollama unavailable
// 3. Test JSON parsing edge cases (malformed arrays, etc)
// 4. Test controller returns 200 with correct DTO
```

### Frontend Test Cases
```typescript
// 1. Modal opens/closes correctly
// 2. Loading state during API call
// 3. Display of 3 suggestions
// 4. Copy to clipboard works
// 5. Apply suggestion updates profile
// 6. Error toast on network failure
```

## Future Enhancements

1. **History/Undo** - Store past suggestions for reference
2. **Batch Operations** - Generate all skill descriptions at once
3. **Custom Prompts** - Let users refine generation style
4. **Ratings** - Users upvote/downvote suggestions for model feedback
5. **Multi-Language** - Support for non-English profiles
6. **Real-time Preview** - Show markdown/formatted preview

## Production Checklist

- [x] All endpoints return standardized `ApiResponse` wrapper
- [x] Request validation with jakarta validation annotations
- [x] Error logging with @Slf4j
- [x] Graceful degradation when Ollama unavailable
- [x] Frontend loading/error states
- [x] Mobile-responsive UI
- [x] Accessibility (ARIA labels, keyboard nav)
- [x] Toast notifications for user feedback
- [x] Code-split lazy loading for page chunk
- [ ] Rate limiting (recommended for production)
- [ ] Suggestion caching (optional performance boost)

## Support & Troubleshooting

### Ollama Not Responding
```
Check: ollama serve is running
Check: Port 11434 is accessible
Check: Model exists: ollama list | grep gemma2
```

### Empty Suggestions
- Check Ollama logs: `ollama logs`
- Try simpler input topic
- Verify model isn't out of context window

### Slow Responses
- First request primes model cache (can take 30-60s)
- Subsequent requests faster (5-15s)
- Increase timeout if needed

## Code Structure Summary

```
Backend:
  com/skillex/dto/ai/
    ├── ProfileAssistantSuggestionDto.java
    ├── GeneratedBioDto.java
    ├── SkillDescriptionDto.java
    └── CircleBlurbDto.java
  com/skillex/service/
    ├── ProfileAssistantService.java
    └── impl/ProfileAssistantServiceImpl.java
  com/skillex/controller/
    └── ProfileAssistantController.java

Frontend:
  src/services/
    └── profileAssistantService.ts
  src/features/profile/
    ├── components/
    │   ├── BioSuggestionModal.tsx
    │   ├── SkillDescriptionEditor.tsx
    │   └── [existing components]
    └── pages/
        ├── ProfileAssistantPage.tsx
        └── [existing pages]
  src/App.tsx (route: /profile-assistant)
```

## Integration Points

### User Service Integration
- `userService.updateProfile(userId, { bio })` - Apply bio
- Could extend to store skill descriptions in `Skill` entity

### Authentication
- Uses Spring Security `Authentication` principal for user ID
- All endpoints require authenticated user (implicit via controller)

### Real-time Sync
- Frontend `refreshUser()` after applying bio
- Updates global auth context for immediate UI reflection

---

**Status**: Production-ready  
**Last Updated**: 2026-06-11  
**Author**: Claude Code
