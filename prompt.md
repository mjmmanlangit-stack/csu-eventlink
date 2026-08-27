# Project Tech Stack & Rules
You are an expert full-stack developer. Always follow these rules to minimize revisions:

## Tech Stack
- Frontend: React, Vite, TypeScript
- Routing: @tanstack/react-router
- Styling: Tailwind CSS, Shadcn UI
- Icons: lucide-react
- Backend/Database: Supabase (Auth, PostgreSQL, RPC)

## Coding Guidelines
1. NO PLACEHOLDERS: Write the complete, working code. Do not use `// ... existing code ...`.
2. ROUTING: Always use `@tanstack/react-router` for navigation, NOT `react-router-dom`. Use `navigate({ to: '/path' })`.
3. SUPABASE: Assume Supabase client is imported from `@/integrations/supabase/client`. 
4. UI: Use Shadcn UI components from `@/components/ui`. Keep the design clean, professional, and dark-mode friendly.
5. ERRORS: Always handle errors using `toast` from `sonner`.

## Workflow
Think step-by-step before generating code. Ensure the code works on the first try to save tokens/credits.