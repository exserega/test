# 🧪 Manual Testing Checklist

## Baseline Functionality Check
**Use this checklist before and after each restructuring stage**

### ✅ Core Functionality

#### App Initialization
- [ ] App loads without errors
- [ ] No red errors in browser console
- [ ] Firebase connection established
- [ ] Songs database loads

#### Search Functionality  
- [ ] Search input accepts text
- [ ] Search returns results for Russian songs
- [ ] Search returns results for English songs
- [ ] Search dropdown appears/disappears correctly
- [ ] Song selection from search results works

#### Song Display
- [ ] Selected song displays in main area
- [ ] Song lyrics render correctly
- [ ] Chords display properly
- [ ] Song structure (verse, chorus, etc.) shows correctly
- [ ] Copy button appears and works

#### Chord Transposition
- [ ] Transpose up/down buttons work
- [ ] Chord changes reflect in displayed song
- [ ] Original key restoration works
- [ ] Transposition overlay opens/closes
- [ ] Key selection in overlay works

#### Metronome
- [ ] Metronome panel shows under song
- [ ] BPM loads from Firebase when song selected
- [ ] Play/Stop button works in panel
- [ ] Metronome overlay opens with button click
- [ ] BPM controls work in overlay (slider, +/-, input)
- [ ] Overlay closes properly

#### Setlist Management
- [ ] "Сет-листы" button opens overlay
- [ ] Can create new setlist
- [ ] Can add songs to setlist
- [ ] Can view existing setlists
- [ ] Can delete setlists
- [ ] Overlay closes properly

#### Presentation Mode
- [ ] Presentation button activates full-screen
- [ ] Song displays correctly in presentation
- [ ] Navigation works (swipe/keys)
- [ ] Font size controls work
- [ ] Exit presentation works

#### Theme Switching
- [ ] Theme toggle button works
- [ ] Light theme displays correctly
- [ ] Dark theme displays correctly
- [ ] Theme persists after reload

### 📱 Mobile Functionality

#### Responsive Design
- [ ] App displays correctly on mobile screen
- [ ] Touch interactions work
- [ ] Swipe navigation functions
- [ ] Mobile-specific UI elements visible

#### Mobile-Specific Features
- [ ] Touch scrolling works smoothly
- [ ] Pinch-to-zoom disabled appropriately
- [ ] Virtual keyboard doesn't break layout
- [ ] Orientation changes handled

### 🔧 Technical Checks

#### Performance
- [ ] App loads in reasonable time (<3 seconds)
- [ ] Search responses are fast (<1 second)
- [ ] Smooth animations and transitions
- [ ] No memory leaks apparent

#### Browser Compatibility
- [ ] Works in Chrome
- [ ] Works in Firefox  
- [ ] Works in Safari
- [ ] Works in Edge

#### PWA Features
- [ ] Service worker functions
- [ ] Offline capabilities work
- [ ] Install prompt appears (mobile)

### 🚨 Error Scenarios

#### Network Issues
- [ ] Graceful handling of Firebase connection loss
- [ ] Appropriate error messages for failed requests
- [ ] App remains functional when offline

#### Edge Cases
- [ ] Empty search results handled
- [ ] Invalid input handled gracefully
- [ ] Large songs display properly
- [ ] Special characters in songs work

---

## 📊 Performance Baseline

### Load Time Metrics
- **Initial load**: _____ ms
- **Search response**: _____ ms  
- **Song render**: _____ ms
- **Theme switch**: _____ ms

### Memory Usage
- **Initial heap**: _____ MB
- **After 10 searches**: _____ MB
- **After setlist creation**: _____ MB

### Bundle Size
- **Total JS size**: _____ KB
- **CSS size**: _____ KB
- **Total assets**: _____ KB

---

## 🔄 Testing Protocol

### Before Each Stage
1. **Run automated baseline tests**
2. **Complete this manual checklist**
3. **Record performance metrics**
4. **Take screenshots of key UI states**

### After Each Stage  
1. **Run automated regression tests**
2. **Complete this manual checklist again**
3. **Compare performance metrics**
4. **Verify no functionality lost**

### Rollback Triggers
- Any checklist item fails
- Performance degrades >10%
- New console errors appear
- Mobile functionality breaks

---

## ✅ Stage Completion Criteria

**Stage can only be considered complete when:**
- [ ] All automated tests pass
- [ ] All manual checklist items pass  
- [ ] Performance within 5% of baseline
- [ ] No new console errors
- [ ] Cross-browser compatibility maintained

**Tester**: _______________  
**Date**: _______________  
**Stage**: _______________  
**Result**: ✅ PASS / ❌ FAIL  
**Notes**: _______________