# Rule: UI, UX & Design System Guidelines

1. **Editorial Tone**:
   - Calm, high-trust, editorial aesthetic.
   - Background: Warm off-white (`#FAF8F5`). Body text: Deep ink (`#111827`).
   - Fonts: `Inter` for UI; `Fraunces` (serif) for Client View headings.
   - Avoid generic neon purple gradients and heavy drop-shadows. Use delicate 1px borders (`#E5E7EB`).
2. **Label Badges with Text**:
   - Never rely on color alone. Always couple with explicit text:
     - `CLIENT_TO_REPLY`: Terracotta / Amber (`#C25E38`)
     - `ASSISTANT_TO_REPLY`: Deep Teal (`#0F766E`)
     - `NO_REPLY_NEEDED`: Neutral Slate (`#64748B`)
     - `NEEDS_REVIEW`: Violet (`#7C3AED`)
3. **Four Mandatory Screen States**:
   - Every view must have **Skeleton**, **Empty State**, **Error State** (with retry), and **Success State** (optimistic update + undo toast).
4. **Responsive Form Factors**:
   - Desktop (>= 1280px): 3 panes (Sidebar, Thread List, Reader/AI Inspector).
   - Tablet (768px - 1279px): 2 panes (Drawer sidebar, Split list/reader).
   - Mobile (< 768px): Single column touch stack with sticky bottom action bar.
5. **Fast Feedback**:
   - Use `sonner` toasts with a 5-second undo window for all destructive or mutation actions.
