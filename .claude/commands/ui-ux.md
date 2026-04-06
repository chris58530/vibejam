Follow the workflow in `.github/prompts/ui-ux-pro-max.prompt.md` to handle this UI/UX request:

$ARGUMENTS

Steps:
1. Analyze the request for product type, style keywords, industry, and stack (default: react since this project uses React + Tailwind)
2. Run the design system search script:
   ```
   python3 .github/prompts/ui-ux-pro-max/scripts/search.py "<keywords>" --design-system -p "BeaverKit"
   ```
3. Run supplemental domain searches as needed (ux, typography, style, etc.)
4. Run stack-specific guidelines:
   ```
   python3 .github/prompts/ui-ux-pro-max/scripts/search.py "<keywords>" --stack react
   ```
5. Synthesize results and implement the design following the pre-delivery checklist in the prompt file.
