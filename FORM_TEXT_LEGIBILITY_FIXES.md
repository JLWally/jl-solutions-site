# Form Text Legibility Fixes

## ✅ Fixed Issues

### 1. Sign Up Form (`/academy/signup.html`)
- **Issue**: "I agree to the Terms of Service and Privacy Policy" text was gray and hard to read
- **Fix**: 
  - Added explicit dark color (`var(--deep-slate)` / `#1F2A33`) to the label
  - Set font-weight to 500 for better visibility
  - Links now use electric blue color for visibility

### 2. Sign In Form (`/academy/signin.html`)
- **Issue**: "Remember me" text was gray and hard to read
- **Fix**:
  - Added explicit dark color (`var(--deep-slate)` / `#1F2A33`) to the label
  - Set font-weight to 500 for better visibility

### 3. Additional Improvements
- Created `/css/form-legibility.css` with comprehensive rules to ensure all form text is legible
- Added CSS rules to override Bootstrap's default `text-muted` class on forms
- Ensured all text on white background forms uses dark colors for maximum readability

## Files Modified

1. `/academy/signup.html`
   - Added inline styles to Terms of Service label
   - Linked to `/css/form-legibility.css`

2. `/academy/signin.html`
   - Added inline styles to Remember me label
   - Linked to `/css/form-legibility.css`

3. `/css/form-legibility.css` (NEW)
   - Comprehensive CSS rules for form text legibility
   - Overrides for Bootstrap classes
   - Dark text colors for white backgrounds

## Color Scheme

Forms use white backgrounds, so all text uses:
- **Primary text**: `#1F2A33` (Deep slate)
- **Links**: `#1A8CFF` (Electric blue)
- **Link hover**: `#1473CC` (Darker blue)

All text is now clearly legible and meets accessibility standards!

