# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-05-19

### Added
- Complete Hotmail Inbox Checker implementation
- Multi-threading support for checking multiple accounts simultaneously
- Keyword search across subject, body, and sender fields
- Proxy support with rotation strategies (random, sequential, round-robin)
- Full inbox capture with message details
- Real-time progress tracking with live statistics
- Export results to CSV and JSON formats
- Modern animated UI with Framer Motion
- Responsive design with Tailwind CSS
- TypeScript with strict type checking
- API routes for check operations and proxy validation
- Session management with automatic cleanup
- Comprehensive error handling and categorization
- Proxy health monitoring with auto-deactivation
- Copy to clipboard functionality
- Dark theme with glass morphism effects

### Technical Features
- Next.js 14 with App Router
- ImapFlow for IMAP connections
- Axios for HTTP requests
- Lucide React icons
- Inter and JetBrains Mono fonts
- Custom Tailwind animations
- ESLint configuration
- PostCSS and Autoprefixer

### Components
- InputForm - Configuration and combo upload
- StatsDisplay - Live statistics dashboard
- HitViewer - Expandable hit results
- ResultsTable - Sortable and filterable results

### API Endpoints
- POST /api/check - Start checking session
- GET /api/check - Get progress and results
- DELETE /api/check - Cancel checking session
- POST /api/proxy - Validate proxy list
- GET /api/proxy - Test single proxy
- GET /api/health - Health check endpoint

### Bug Fixes
- Fixed CheckCircle import order in HitViewer component
- Added proper cleanup on component unmount
- Resolved all TypeScript errors

---

**Author:** Ziver  
**License:** MIT  
**Status:** ✅ Production Ready
